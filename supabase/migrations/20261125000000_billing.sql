-- Abrechnung mit Stripe
--   * profiles.trial_ends_at: 7 Tage kostenlose Testphase ab Registrierung (Trainer & Studios, ohne Zahlungsdaten).
--     Bestehende Trainer/Studios bekommen ab jetzt 7 Tage.
--   * subscriptions: ein Abo je zahlendem Konto (Solo-Trainer oder Studio-Inhaber), gespiegelt aus Stripe-Webhooks.
--     Trainer eines Studios sind über das Studio-Abo abgedeckt und haben kein eigenes.
--   * trainer_client_limit / redeem_invitation: Kundenlimit des gebuchten Trainer-Pakets beim Einlösen von Einladungen.

alter table public.profiles add column trial_ends_at timestamptz;
update public.profiles set trial_ends_at = now() + interval '7 days';
alter table public.profiles alter column trial_ends_at set default now() + interval '7 days';
alter table public.profiles alter column trial_ends_at set not null;

create table public.subscriptions (
  owner_id               uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id     text not null unique,
  stripe_subscription_id text unique,
  plan                   text check (plan in ('trainer_10', 'trainer_20', 'trainer_unlimited', 'studio')),
  billing_interval       text check (billing_interval in ('month', 'year')),
  -- Stripe-Status: active, trialing, past_due, unpaid, canceled, incomplete, incomplete_expired, paused
  status                 text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);

-- Zugriff nur über die API (Service-Rolle)
alter table public.subscriptions enable row level security;

/** Max. Kunden eines Trainers laut gebuchtem Paket; null = unbegrenzt (Testphase, Studio-Trainer, großes Paket). */
create function public.trainer_client_limit(p_trainer uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select studio_id from public.profiles where id = p_trainer) is not null then null
    else (
      select case s.plan when 'trainer_10' then 10 when 'trainer_20' then 20 end
        from public.subscriptions s
       where s.owner_id = p_trainer
         and s.status in ('active', 'trialing', 'past_due')
    )
  end;
$$;

create or replace function public.redeem_invitation(p_code text, p_client uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv     public.invitations%rowtype;
  client  public.profiles%rowtype;
  v_limit integer;
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

  -- Kundenlimit des Trainer-Pakets (Zeile sperren, damit gleichzeitige Einlösungen das Limit nicht überschreiten)
  perform 1 from public.profiles where id = inv.trainer_id for update;
  v_limit := public.trainer_client_limit(inv.trainer_id);
  if v_limit is not null
     and (select count(*) from public.profiles where trainer_id = inv.trainer_id and role = 'client') >= v_limit then
    raise exception 'TRAINER_CLIENT_LIMIT';
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

revoke execute on function public.trainer_client_limit(uuid)          from public, anon, authenticated;
revoke execute on function public.redeem_invitation(text, uuid)       from public, anon, authenticated;
