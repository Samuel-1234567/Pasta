-- One subscription row per profile (Stripe + plan state).

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null,
  status text not null,
  current_period_end timestamptz,
  constraint subscriptions_user_id_key unique (user_id),
  constraint subscriptions_plan_check check (plan in ('free', 'pro')),
  constraint subscriptions_status_check check (
    status in ('active', 'canceled', 'past_due', 'trialing')
  )
);

create index subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create index subscriptions_stripe_subscription_id_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on table public.subscriptions is 'Billing state per profile; plan is free or pro; status mirrors Stripe-style lifecycle.';

comment on column public.subscriptions.current_period_end is
  'End of the current billing period (e.g. Stripe subscription.current_period_end); null for free or unknown.';
