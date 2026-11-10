-- FitnessCompanion – initiales Schema
--
-- Zugriffsmodell:
--   * Alle Tabellen haben Row Level Security AKTIVIERT und KEINE Policies.
--     → Mit dem öffentlichen (publishable/anon) Key ist kein Zugriff möglich.
--   * Web und Apps greifen ausschließlich über die API (/api/v1) zu. Diese prüft
--     den Supabase-Login, die Rollen und Zuständigkeiten und nutzt serverseitig
--     den Secret Key (umgeht RLS).
--   * Die Hilfsfunktionen sind nur für service_role ausführbar.

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null,
  role        text not null check (role in ('trainer', 'client')),
  trainer_id  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint client_has_no_self_trainer check (trainer_id is null or trainer_id <> id)
);
create index profiles_trainer_idx on public.profiles (trainer_id);

create table public.invitations (
  code        text primary key,
  trainer_id  uuid not null references public.profiles (id) on delete cascade,
  email       text,
  used_by     uuid references public.profiles (id) on delete set null,
  used_at     timestamptz,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index invitations_trainer_idx on public.invitations (trainer_id);

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text,
  days        jsonb not null default '[]'::jsonb,  -- PlanDay[]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index plans_trainer_idx on public.plans (trainer_id);

create table public.plan_assignments (
  plan_id     uuid not null references public.plans (id) on delete cascade,
  client_id   uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (plan_id, client_id)
);
create index plan_assignments_client_idx on public.plan_assignments (client_id);

create table public.workouts (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  plan_id      uuid references public.plans (id) on delete set null,
  title        text not null,
  performed_at timestamptz not null default now(),
  duration_min integer check (duration_min >= 0),
  notes        text,
  exercises    jsonb not null default '[]'::jsonb,  -- LoggedExercise[]
  created_at   timestamptz not null default now()
);
create index workouts_client_idx on public.workouts (client_id, performed_at desc);

create table public.measurements (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles (id) on delete cascade,
  measured_at    timestamptz not null default now(),
  body_weight_kg numeric(5, 2),
  body_fat_pct   numeric(4, 1),
  waist_cm       numeric(5, 1),
  notes          text,
  created_at     timestamptz not null default now()
);
create index measurements_client_idx on public.measurements (client_id, measured_at desc);

-- RLS an, keine Policies → nur service_role (API) hat Zugriff.
alter table public.profiles         enable row level security;
alter table public.invitations      enable row level security;
alter table public.plans            enable row level security;
alter table public.plan_assignments enable row level security;
alter table public.workouts         enable row level security;
alter table public.measurements     enable row level security;

-- ---------------------------------------------------------------------------
-- Einladung einlösen (atomar). Fehlercodes werden von der API übersetzt.
-- ---------------------------------------------------------------------------

create function public.redeem_invitation(p_code text, p_client uuid)
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
  update public.profiles set trainer_id = inv.trainer_id where id = p_client;
  return inv.trainer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profil automatisch anlegen, wenn sich jemand über Supabase Auth registriert.
-- Erwartete user_metadata (signUp options.data): { name, role, invite_code? }
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  v_code text := nullif(trim(new.raw_user_meta_data ->> 'invite_code'), '');
begin
  if v_role not in ('trainer', 'client') then
    v_role := 'client';
  end if;

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    v_role
  );

  -- Ungültige Codes dürfen die Registrierung nicht verhindern; der Kunde kann
  -- den Code später in der App/im Web erneut eingeben.
  if v_role = 'client' and v_code is not null then
    begin
      perform public.redeem_invitation(v_code, new.id);
    exception when others then
      null;
    end;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- E-Mail-Änderungen aus Supabase Auth ins Profil übernehmen.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Kundenübersicht für Trainer
-- ---------------------------------------------------------------------------

create function public.client_summaries(p_trainer uuid)
returns table (
  id                  uuid,
  name                text,
  email               text,
  joined_at           timestamptz,
  last_workout_at     timestamptz,
  workouts_last_7_days integer,
  active_plans        integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.name,
    p.email,
    p.created_at,
    (select max(w.performed_at) from public.workouts w where w.client_id = p.id),
    (select count(*)::int from public.workouts w
       where w.client_id = p.id and w.performed_at >= now() - interval '7 days'),
    (select count(*)::int from public.plan_assignments a
       join public.plans pl on pl.id = a.plan_id
       where a.client_id = p.id and pl.trainer_id = p_trainer)
  from public.profiles p
  where p.role = 'client' and p.trainer_id = p_trainer
  order by lower(p.name);
$$;

-- Hilfsfunktionen nur für die API (service_role), nicht für anon/authenticated.
revoke execute on function public.redeem_invitation(text, uuid) from public, anon, authenticated;
revoke execute on function public.client_summaries(uuid)        from public, anon, authenticated;
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.handle_user_email_change()    from public, anon, authenticated;
