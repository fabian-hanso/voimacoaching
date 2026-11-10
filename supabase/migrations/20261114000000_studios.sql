-- Voima Coach – Studios
--
-- Modell:
--   * Neuer Kontotyp „studio“ (Inhaber). Pro Inhaber genau ein Studio.
--   * Trainer treten per Studio-Einladung bei (profiles.studio_id). Max. Anzahl je Studio: studios.max_trainers.
--   * Kunden eines Studio-Trainers gehören ebenfalls zum Studio (profiles.studio_id). Fällt der Trainer weg,
--     bleiben sie als „ohne Trainer“ im Studio und können neu zugewiesen werden.
--   * Übertragungen laufen atomar in SQL-Funktionen (nur für service_role / die API).
--
-- Zugriff wie gehabt: RLS an, keine Policies – alles über die API.

-- ---------------------------------------------------------------------------
-- Rollen & Tabellen
-- ---------------------------------------------------------------------------

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('trainer', 'client', 'studio'));

create table public.studios (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null unique references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 100),
  max_trainers integer not null default 10 check (max_trainers > 0),
  -- Studio-Logo im Bucket „avatars“ unter studios/<studio-id>/<uuid>.<ext>; sichtbar für Trainer & Kunden des Studios
  logo_path    text,
  created_at   timestamptz not null default now()
);
alter table public.studios enable row level security;

alter table public.profiles add column studio_id uuid references public.studios (id) on delete set null;
create index profiles_studio_idx on public.profiles (studio_id);

create table public.studio_invitations (
  code       text primary key,
  studio_id  uuid not null references public.studios (id) on delete cascade,
  email      text,
  used_by    uuid references public.profiles (id) on delete set null,
  used_at    timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index studio_invitations_studio_idx on public.studio_invitations (studio_id);
alter table public.studio_invitations enable row level security;

-- Neue Hinweis-Arten
alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed',          -- an Kunde:   „Dein Coach ist jetzt …“
  'client_transferred',     -- an Trainer: „… wurde dir übertragen“
  'client_reassigned',      -- an Trainer: „… wird jetzt von jemand anderem betreut“
  'trainer_joined',         -- an Studio:  „… ist deinem Studio beigetreten“
  'trainer_removed',        -- an Trainer: „Du wurdest aus Studio … entfernt“
  'studio_trainer_deleted', -- an Studio:  „Trainer … hat das Konto gelöscht“
  'studio_deleted'          -- an Trainer: „Studio … wurde aufgelöst“
));

-- ---------------------------------------------------------------------------
-- Kunden-Einladung einlösen: Kunde erbt das Studio des Trainers
-- ---------------------------------------------------------------------------

create or replace function public.redeem_invitation(p_code text, p_client uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv    public.invitations%rowtype;
  client public.profiles%rowtype;
begin
  select * into client from public.profiles where id = p_client;
  if not found or client.role <> 'client' then
    raise exception 'INVITE_NOT_CLIENT';
  end if;

  select * into inv from public.invitations where code = upper(p_code) for update;
  if not found then
    raise exception 'INVITE_INVALID';
  elsif inv.used_by is not null then
    raise exception 'INVITE_USED';
  elsif inv.expires_at < now() then
    raise exception 'INVITE_EXPIRED';
  elsif inv.email is not null and lower(inv.email) <> lower(client.email) then
    raise exception 'INVITE_EMAIL_MISMATCH';
  end if;

  update public.invitations set used_by = p_client, used_at = now() where code = inv.code;
  update public.profiles
     set trainer_id = inv.trainer_id,
         studio_id  = (select t.studio_id from public.profiles t where t.id = inv.trainer_id)
   where id = p_client;
  return inv.trainer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Studio-Einladung einlösen (Trainer tritt bei)
-- ---------------------------------------------------------------------------

create function public.redeem_studio_invitation(p_code text, p_trainer uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv     public.studio_invitations%rowtype;
  trainer public.profiles%rowtype;
  studio  public.studios%rowtype;
begin
  select * into trainer from public.profiles where id = p_trainer;
  if not found or trainer.role <> 'trainer' then
    raise exception 'STUDIO_INVITE_NOT_TRAINER';
  elsif trainer.studio_id is not null then
    raise exception 'TRAINER_IN_STUDIO';
  end if;

  select * into inv from public.studio_invitations where code = upper(p_code) for update;
  if not found then
    raise exception 'INVITE_INVALID';
  elsif inv.used_by is not null then
    raise exception 'INVITE_USED';
  elsif inv.expires_at < now() then
    raise exception 'INVITE_EXPIRED';
  elsif inv.email is not null and lower(inv.email) <> lower(trainer.email) then
    raise exception 'INVITE_EMAIL_MISMATCH';
  end if;

  select * into studio from public.studios where id = inv.studio_id for update;
  if (select count(*) from public.profiles where studio_id = studio.id and role = 'trainer') >= studio.max_trainers then
    raise exception 'STUDIO_FULL';
  end if;

  update public.studio_invitations set used_by = p_trainer, used_at = now() where code = inv.code;
  update public.profiles set studio_id = studio.id where id = p_trainer;
  -- Bestehende Kunden des Trainers kommen mit ins Studio
  update public.profiles set studio_id = studio.id where trainer_id = p_trainer and role = 'client';
  insert into public.notices (user_id, kind, actor_name) values (studio.owner_id, 'trainer_joined', trainer.name);
  return studio.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Neue Nutzer: Studio anlegen bzw. Studio-Einladung einlösen
-- user_metadata: { name, role, invite_code?, studio_name?, studio_code? }
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role   text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  v_name   text;
  v_code   text := nullif(trim(new.raw_user_meta_data ->> 'invite_code'), '');
  v_studio text := nullif(trim(new.raw_user_meta_data ->> 'studio_code'), '');
begin
  if v_role not in ('trainer', 'client', 'studio') then
    v_role := 'client';
  end if;
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, email, name, role) values (new.id, new.email, v_name, v_role);

  if v_role = 'studio' then
    insert into public.studios (owner_id, name)
    values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'studio_name'), ''), v_name), 100));
  end if;

  -- Ungültige Codes dürfen die Registrierung nicht verhindern (später erneut eingebbar).
  if v_role = 'client' and v_code is not null then
    begin
      perform public.redeem_invitation(v_code, new.id);
    exception when others then null;
    end;
  end if;
  if v_role = 'trainer' and v_studio is not null then
    begin
      perform public.redeem_studio_invitation(v_studio, new.id);
    exception when others then null;
    end;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Kontolöschungen: Studio-Fälle ergänzen
-- ---------------------------------------------------------------------------

create or replace function public.handle_profile_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_studio public.studios%rowtype;
begin
  if old.role = 'client' and old.trainer_id is not null then
    insert into public.notices (user_id, kind, actor_name)
    select old.trainer_id, 'client_deleted', old.name
    where exists (select 1 from public.profiles where id = old.trainer_id);
  elsif old.role = 'trainer' then
    insert into public.notices (user_id, kind, actor_name)
    select p.id, 'trainer_deleted', old.name
    from public.profiles p where p.trainer_id = old.id and p.role = 'client';
    -- Studio-Inhaber informieren; die Kunden bleiben als „ohne Trainer“ im Studio
    if old.studio_id is not null then
      insert into public.notices (user_id, kind, actor_name)
      select s.owner_id, 'studio_trainer_deleted', old.name from public.studios s where s.id = old.studio_id;
    end if;
  elsif old.role = 'studio' then
    select * into v_studio from public.studios where owner_id = old.id;
    if found then
      insert into public.notices (user_id, kind, actor_name)
      select p.id, 'studio_deleted', v_studio.name
      from public.profiles p where p.studio_id = v_studio.id and p.role = 'trainer';
    end if;
  end if;
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- Studio-Übersicht: alle Kunden mit Trainer & Aktivität
-- ---------------------------------------------------------------------------

create function public.studio_client_summaries(p_studio uuid)
returns table (
  id                   uuid,
  name                 text,
  email                text,
  avatar_path          text,
  trainer_id           uuid,
  trainer_name         text,
  joined_at            timestamptz,
  last_workout_at      timestamptz,
  workouts_last_7_days integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.name, c.email, c.avatar_path, c.trainer_id, t.name, c.created_at,
    (select max(w.performed_at) from public.workouts w where w.client_id = c.id),
    (select count(*)::int from public.workouts w where w.client_id = c.id and w.performed_at >= now() - interval '7 days')
  from public.profiles c
  left join public.profiles t on t.id = c.trainer_id
  where c.role = 'client' and c.studio_id = p_studio
  order by lower(c.name);
$$;

-- ---------------------------------------------------------------------------
-- Übertragungen
-- ---------------------------------------------------------------------------

-- Einen Kunden einem (anderen) Trainer des Studios zuweisen.
-- Pläne des bisherigen Trainers, die dem Kunden zugewiesen sind, werden für den neuen Trainer KOPIERT.
create function public.studio_transfer_client(p_studio uuid, p_client uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client public.profiles%rowtype;
  v_to     public.profiles%rowtype;
  v_plan   public.plans%rowtype;
  v_copy   uuid;
begin
  select * into v_client from public.profiles where id = p_client for update;
  if not found or v_client.role <> 'client' or v_client.studio_id is distinct from p_studio then
    raise exception 'CLIENT_NOT_IN_STUDIO';
  end if;
  select * into v_to from public.profiles where id = p_to;
  if not found or v_to.role <> 'trainer' or v_to.studio_id is distinct from p_studio then
    raise exception 'TRAINER_NOT_IN_STUDIO';
  end if;
  if v_client.trainer_id = p_to then
    raise exception 'SAME_TRAINER';
  end if;

  if v_client.trainer_id is not null then
    for v_plan in
      select p.* from public.plans p
      join public.plan_assignments a on a.plan_id = p.id
      where a.client_id = p_client and p.trainer_id = v_client.trainer_id
    loop
      insert into public.plans (trainer_id, title, description, days)
      values (p_to, v_plan.title, v_plan.description, v_plan.days)
      returning id into v_copy;
      insert into public.plan_assignments (plan_id, client_id) values (v_copy, p_client);
      delete from public.plan_assignments where plan_id = v_plan.id and client_id = p_client;
    end loop;
    insert into public.notices (user_id, kind, actor_name) values (v_client.trainer_id, 'client_reassigned', v_client.name);
  end if;

  update public.profiles set trainer_id = p_to where id = p_client;
  insert into public.notices (user_id, kind, actor_name) values (p_client, 'coach_changed', v_to.name);
  insert into public.notices (user_id, kind, actor_name) values (p_to, 'client_transferred', v_client.name);
end;
$$;

-- „Trainer fällt aus“: ALLE Kunden, Pläne und offenen Kunden-Einladungen an einen anderen Trainer übertragen.
create function public.studio_transfer_trainer(p_studio uuid, p_from uuid, p_to uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.profiles%rowtype;
  v_to   public.profiles%rowtype;
  v_count integer;
begin
  if p_from = p_to then
    raise exception 'SAME_TRAINER';
  end if;
  select * into v_from from public.profiles where id = p_from;
  select * into v_to from public.profiles where id = p_to;
  if v_from.id is null or v_from.role <> 'trainer' or v_from.studio_id is distinct from p_studio
     or v_to.id is null or v_to.role <> 'trainer' or v_to.studio_id is distinct from p_studio then
    raise exception 'TRAINER_NOT_IN_STUDIO';
  end if;

  update public.plans set trainer_id = p_to, updated_at = now() where trainer_id = p_from;
  update public.invitations set trainer_id = p_to where trainer_id = p_from and used_by is null;

  insert into public.notices (user_id, kind, actor_name)
  select c.id, 'coach_changed', v_to.name from public.profiles c where c.trainer_id = p_from and c.role = 'client';
  insert into public.notices (user_id, kind, actor_name)
  select p_to, 'client_transferred', c.name from public.profiles c where c.trainer_id = p_from and c.role = 'client';

  update public.profiles set trainer_id = p_to, studio_id = p_studio where trainer_id = p_from and role = 'client';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Trainer aus dem Studio entfernen – nur ohne Kunden (vorher übertragen).
create function public.studio_remove_trainer(p_studio uuid, p_trainer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainer public.profiles%rowtype;
begin
  select * into v_trainer from public.profiles where id = p_trainer;
  if not found or v_trainer.role <> 'trainer' or v_trainer.studio_id is distinct from p_studio then
    raise exception 'TRAINER_NOT_IN_STUDIO';
  end if;
  if exists (select 1 from public.profiles where trainer_id = p_trainer and role = 'client') then
    raise exception 'TRAINER_HAS_CLIENTS';
  end if;
  update public.profiles set studio_id = null where id = p_trainer;
  insert into public.notices (user_id, kind, actor_name)
  select p_trainer, 'trainer_removed', s.name from public.studios s where s.id = p_studio;
end;
$$;

revoke execute on function public.redeem_studio_invitation(text, uuid)          from public, anon, authenticated;
revoke execute on function public.redeem_invitation(text, uuid)                 from public, anon, authenticated;
revoke execute on function public.handle_new_user()                             from public, anon, authenticated;
revoke execute on function public.handle_profile_deleted()                      from public, anon, authenticated;
revoke execute on function public.studio_client_summaries(uuid)                 from public, anon, authenticated;
revoke execute on function public.studio_transfer_client(uuid, uuid, uuid)      from public, anon, authenticated;
revoke execute on function public.studio_transfer_trainer(uuid, uuid, uuid)     from public, anon, authenticated;
revoke execute on function public.studio_remove_trainer(uuid, uuid)             from public, anon, authenticated;
