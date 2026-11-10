-- Voima Coach – Feature-Wünsche von Trainern (später auch Studios)
--
-- * Trainer reichen Wünsche über die API ein (POST /api/v1/feature-requests).
-- * Lesen ist NUR für Admins vorgesehen (kommendes Admin-Dashboard) – bis dahin direkt in Supabase.
-- * RLS an, keine Policies: kein Zugriff mit dem Publishable Key.

create table public.feature_requests (
  id          uuid primary key default gen_random_uuid(),
  -- Bei Kontolöschung bleibt der Wunsch anonym erhalten (Produktfeedback), die Zuordnung entfällt.
  user_id     uuid references public.profiles (id) on delete set null,
  role        text not null check (role in ('trainer', 'studio')),
  body        text not null check (char_length(body) between 3 and 2000),
  area        text check (area in ('plans', 'clients', 'tracking', 'chat', 'billing', 'other')),
  importance  text check (importance in ('nice', 'important', 'essential')),
  context     text check (char_length(context) <= 200), -- Herkunft, z. B. „Plan-Editor“ oder Pfad
  status      text not null default 'new'
              check (status in ('new', 'planned', 'in_progress', 'done', 'declined')),
  created_at  timestamptz not null default now()
);
create index feature_requests_status_idx on public.feature_requests (status, created_at desc);
create index feature_requests_user_idx on public.feature_requests (user_id, created_at desc);

alter table public.feature_requests enable row level security;
