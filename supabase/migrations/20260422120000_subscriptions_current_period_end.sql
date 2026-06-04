-- Safe if an older copy of 20260421120000_subscriptions.sql was already applied without this column.

alter table public.subscriptions
  add column if not exists current_period_end timestamptz;

comment on column public.subscriptions.current_period_end is
  'End of the current billing period (e.g. Stripe subscription.current_period_end); null for free or unknown.';
