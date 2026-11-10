-- Voima Coach – Studio-Mitglieder ohne festen Coach
--
-- * studios.join_code: wiederverwendbarer Mitglieds-Code pro Studio (z. B. als QR-Code an der Rezeption).
--   Erneuerbar – der alte Code funktioniert danach nicht mehr.
-- * profiles.studio_member: Kunde ist selbst Mitglied des Studios (per Code beigetreten) – unabhängig vom Coach.
--   Mitglieder behalten ihr Studio, wenn ein Coach die Verbindung beendet oder sie sich einem
--   eigenständigen Coach anschließen. Wechselt das Studio (z. B. Coach aus anderem Studio), endet die Mitgliedschaft.
-- * Mitglieder können Kurse und 1:1-Termine bei allen Trainern des Studios buchen (bestehende Logik über studio_id).

-- ---------------------------------------------------------------------------
-- Mitglieds-Code
-- ---------------------------------------------------------------------------

create function public.generate_join_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
    from generate_series(1, 8);
$$;

alter table public.studios add column join_code text;
update public.studios set join_code = public.generate_join_code() where join_code is null;
alter table public.studios
  alter column join_code set default public.generate_join_code(),
  alter column join_code set not null,
  add constraint studios_join_code_format check (join_code ~ '^[A-Z0-9]{8}$'),
  add constraint studios_join_code_key unique (join_code);

-- ---------------------------------------------------------------------------
-- Mitgliedschaft
-- ---------------------------------------------------------------------------

alter table public.profiles add column studio_member boolean not null default false;

-- Wechselt das Studio, endet die Mitgliedschaft automatisch (außer beim Beitritt selbst).
create function public.handle_studio_member_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.studio_id is null then
    new.studio_member := false;
  elsif new.studio_id is distinct from old.studio_id and not (new.studio_member and not old.studio_member) then
    new.studio_member := false;
  end if;
  return new;
end;
$$;

create trigger on_profile_studio_member_flag
  before update of studio_id, studio_member on public.profiles
  for each row execute function public.handle_studio_member_flag();

-- Kunde tritt per Mitglieds-Code bei (auch mit eigenständigem Coach; nicht mit Coach aus einem anderen Studio)
create function public.join_studio_as_client(p_code text, p_client uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client  public.profiles%rowtype;
  v_studio  public.studios%rowtype;
  v_coach_studio uuid;
begin
  select * into v_client from public.profiles where id = p_client for update;
  if not found or v_client.role <> 'client' then
    raise exception 'STUDIO_JOIN_NOT_CLIENT';
  end if;
  select * into v_studio from public.studios where join_code = upper(trim(p_code));
  if not found then
    raise exception 'STUDIO_CODE_INVALID';
  end if;
  if v_client.studio_id = v_studio.id and v_client.studio_member then
    raise exception 'STUDIO_ALREADY_MEMBER';
  end if;
  if v_client.trainer_id is not null then
    select studio_id into v_coach_studio from public.profiles where id = v_client.trainer_id;
    if v_coach_studio is not null and v_coach_studio <> v_studio.id then
      raise exception 'CLIENT_COACH_OTHER_STUDIO';
    end if;
  end if;

  update public.profiles set studio_id = v_studio.id, studio_member = true where id = p_client;
  insert into public.notices (user_id, kind, actor_name) values (v_studio.owner_id, 'member_joined', v_client.name);
  return v_studio.id;
end;
$$;

-- Einladung eines Coaches einlösen: Mitglieder behalten ihr Studio bei eigenständigen Coaches
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
         studio_id  = coalesce(
           (select t.studio_id from public.profiles t where t.id = inv.trainer_id),
           case when client.studio_member then client.studio_id end
         )
   where id = p_client;
  return inv.trainer_id;
end;
$$;

-- Registrierung: Kunden können direkt mit Mitglieds-Code (QR) beitreten
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
  v_join   text := nullif(trim(new.raw_user_meta_data ->> 'studio_join_code'), '');
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
  if v_role = 'client' and v_join is not null then
    begin
      perform public.join_studio_as_client(v_join, new.id);
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

-- Studio-Kundenliste: zusätzlich, ob der Kunde Mitglied ist
drop function public.studio_client_summaries(uuid);
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
  workouts_last_7_days integer,
  studio_member        boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.name, c.email, c.avatar_path, c.trainer_id, t.name, c.created_at,
    (select max(w.performed_at) from public.workouts w where w.client_id = c.id),
    (select count(*)::int from public.workouts w where w.client_id = c.id and w.performed_at >= now() - interval '7 days'),
    c.studio_member
  from public.profiles c
  left join public.profiles t on t.id = c.trainer_id
  where c.role = 'client' and c.studio_id = p_studio
  order by lower(c.name);
$$;

revoke execute on function public.generate_join_code()                  from public, anon, authenticated;
revoke execute on function public.handle_studio_member_flag()           from public, anon, authenticated;
revoke execute on function public.join_studio_as_client(text, uuid)     from public, anon, authenticated;
revoke execute on function public.redeem_invitation(text, uuid)         from public, anon, authenticated;
revoke execute on function public.handle_new_user()                     from public, anon, authenticated;
revoke execute on function public.studio_client_summaries(uuid)         from public, anon, authenticated;

-- Hinweise an das Studio: Mitglied beigetreten / ausgetreten
alter table public.notices drop constraint notices_kind_check;
alter table public.notices add constraint notices_kind_check check (kind in (
  'client_deleted', 'trainer_deleted', 'client_left', 'client_removed',
  'coach_changed', 'client_transferred', 'client_reassigned',
  'trainer_joined', 'trainer_removed', 'studio_trainer_deleted', 'studio_deleted',
  'appointment_requested', 'appointment_confirmed', 'appointment_declined', 'appointment_cancelled',
  'appointment_booked', 'appointment_comment',
  'course_assigned', 'course_cancelled',
  'member_joined', 'member_left'
));
