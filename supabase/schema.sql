-- Safe to run again and again (idempotent). Run in Supabase -> SQL Editor.
create table if not exists tasks (
  id bigserial primary key, created_at timestamptz default now(), updated_at timestamptz default now(),
  type text not null, niche text, status text default 'pending', attempts int default 0,
  payload jsonb default '{}', result jsonb, error text);
create table if not exists board (
  id bigserial primary key, created_at timestamptz default now(),
  agent text, role text, kind text, content text, task_id bigint);
create table if not exists leads (
  id bigserial primary key, created_at timestamptz default now(),
  name text, address text, phone text, website text, query text, unique (name, address));
alter table leads add column if not exists source text default 'places';
alter table leads add column if not exists username text;
alter table leads add column if not exists keyword text;
alter table leads add column if not exists subreddit text;
alter table leads add column if not exists title text;
alter table leads add column if not exists url text;
alter table leads add column if not exists intent_summary text;
alter table leads add column if not exists score int;
alter table leads add column if not exists category text;
alter table leads add column if not exists status text default 'new';
alter table leads add column if not exists outreach jsonb;
alter table leads add column if not exists notes text;
alter table leads add column if not exists source_id text;
create table if not exists seen (id text primary key, created_at timestamptz default now());
create table if not exists settings (key text primary key, value text);
insert into settings values ('auto_publish','false'),('daily_limit','3'),('lead_queries',''),('auto_leads','true') on conflict do nothing;
alter table tasks enable row level security;
alter table board enable row level security;
alter table leads enable row level security;
alter table seen enable row level security;
alter table settings enable row level security;
