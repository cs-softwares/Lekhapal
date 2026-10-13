-- All billing writes are server-only. No client can grant itself premium.
create table if not exists public.premium_config (
  id boolean primary key default true check (id),
  product_id text not null,
  enabled boolean not null default false
);
insert into public.premium_config(id, product_id, enabled)
values (true, 'lekhpal_premium', false) on conflict (id) do nothing;

create table if not exists public.premium_purchases (
  purchase_token text primary key,
  user_id uuid not null references auth.users(id),
  product_id text not null,
  base_plan_id text not null,
  state text not null,
  expires_at timestamptz,
  verified_at timestamptz not null,
  checked_at timestamptz not null,
  acknowledged boolean not null default false,
  linked_purchase_token text,
  superseded boolean not null default false,
  next_check_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists premium_purchases_user on public.premium_purchases(user_id);
create index if not exists premium_purchases_check on public.premium_purchases(next_check_at);
alter table public.premium_config enable row level security;
alter table public.premium_purchases enable row level security;
revoke all on public.premium_config, public.premium_purchases from anon, authenticated;
grant all on public.premium_config, public.premium_purchases to service_role;

-- Atomic ownership binding and replacement handling. A repeated token is
-- idempotent; it can never be claimed by another account or add time twice.
create or replace function public.record_premium_purchase(
  p_token text, p_user uuid, p_product text, p_plan text, p_state text,
  p_expiry timestamptz, p_checked timestamptz, p_ack boolean,
  p_linked text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare existing_user uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('lekhpal-premium', 0));
  select user_id into existing_user from public.premium_purchases where purchase_token = p_token;
  if existing_user is not null and existing_user <> p_user then
    raise exception 'Purchase belongs to a different account';
  end if;
  select user_id into existing_user from public.premium_purchases where purchase_token = p_linked;
  if existing_user is not null and existing_user <> p_user then
    raise exception 'Linked purchase belongs to a different account';
  end if;
  insert into public.premium_purchases(
    purchase_token,user_id,product_id,base_plan_id,state,expires_at,verified_at,
    checked_at,acknowledged,linked_purchase_token,superseded,next_check_at
  ) values (
    p_token,p_user,p_product,p_plan,p_state,p_expiry,p_checked,p_checked,p_ack,p_linked,
    exists(select 1 from public.premium_purchases where linked_purchase_token=p_token),
    now()+interval '5 minutes'
  ) on conflict (purchase_token) do update set
    state=excluded.state, expires_at=excluded.expires_at,
    verified_at=excluded.verified_at, checked_at=excluded.checked_at,
    linked_purchase_token=coalesce(excluded.linked_purchase_token, public.premium_purchases.linked_purchase_token),
    acknowledged=excluded.acknowledged, next_check_at=excluded.next_check_at
  where public.premium_purchases.checked_at <= excluded.checked_at;
  if p_linked is not null then
    update public.premium_purchases set superseded=true where purchase_token=p_linked;
  end if;
end $$;
revoke all on function public.record_premium_purchase(text,uuid,text,text,text,timestamptz,timestamptz,boolean,text) from public, anon, authenticated;
grant execute on function public.record_premium_purchase(text,uuid,text,text,text,timestamptz,timestamptz,boolean,text) to service_role;
