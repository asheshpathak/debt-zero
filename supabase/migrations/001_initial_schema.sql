-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Users table (synced from Firebase Auth)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text unique not null,
  email text,
  name text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own record"
  on public.users for select
  using (firebase_uid = current_setting('app.firebase_uid', true));

-- Debt submissions (anonymous, no auth required)
create table if not exists public.debt_submissions (
  id uuid primary key default gen_random_uuid(),
  form_data jsonb not null,
  created_at timestamptz default now()
);

alter table public.debt_submissions enable row level security;

-- No direct client access — only service role reads/writes this
create policy "Service role only"
  on public.debt_submissions for all
  using (false);

-- Plans table
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.debt_submissions(id) on delete cascade,
  user_id text references public.users(firebase_uid) on delete set null,
  paid boolean default false,
  plan_data jsonb,
  created_at timestamptz default now()
);

alter table public.plans enable row level security;

-- Service role only (backend controls all access)
create policy "Service role only"
  on public.plans for all
  using (false);

-- Payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade,
  user_id text references public.users(firebase_uid) on delete set null,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  status text default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Service role only"
  on public.payments for all
  using (false);

-- Indexes for performance
create index if not exists idx_plans_submission_id on public.plans(submission_id);
create index if not exists idx_plans_user_id on public.plans(user_id);
create index if not exists idx_payments_plan_id on public.payments(plan_id);
create index if not exists idx_payments_order_id on public.payments(razorpay_order_id);
