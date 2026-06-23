-- Flowmail — Row Level Security & auth sync
--
-- Run this in the Supabase SQL editor *after* `npx prisma migrate dev` has
-- created the tables. Prisma manages table structure; it does not manage
-- RLS policies or triggers on the `auth` schema, so those live here.
--
-- Why RLS at all, when the app talks to Postgres through Prisma with a
-- privileged connection that bypasses RLS? Two reasons: (1) defense in
-- depth if that connection string is ever scoped down, and (2) Supabase
-- Realtime (used for live dashboard updates) authorizes Postgres Changes
-- subscriptions against the requesting user's JWT through these same
-- policies — without them, Realtime would have nothing to authorize against.

-- ──────────────────────────────────────────────────────────
-- Helper: is the current JWT's user a member of this workspace?
-- ──────────────────────────────────────────────────────────

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- ──────────────────────────────────────────────────────────
-- auth.users → public.users sync
-- ──────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- Enable RLS
-- ──────────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.subscribers enable row level security;
alter table public.fields enable row level security;
alter table public.groups enable row level security;
alter table public.subscriber_groups enable row level security;
alter table public.campaigns enable row level security;
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.email_jobs enable row level security;
alter table public.email_events enable row level security;
alter table public.sending_domains enable row level security;
alter table public.api_keys enable row level security;
alter table public.events enable row level security;

-- ──────────────────────────────────────────────────────────
-- users — see your own row, and co-members of your workspaces
-- ──────────────────────────────────────────────────────────

create policy "users_select" on public.users
  for select using (
    id = auth.uid()
    or id in (
      select wm2.user_id from public.workspace_members wm1
      join public.workspace_members wm2 on wm2.workspace_id = wm1.workspace_id
      where wm1.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────
-- workspaces & membership
-- ──────────────────────────────────────────────────────────

create policy "workspaces_select" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspace_members_select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

-- ──────────────────────────────────────────────────────────
-- Tenant tables — read/write gated on workspace membership.
-- Writes from the app go through Prisma (bypasses RLS via the
-- privileged connection); these policies are what Realtime and any
-- future direct-from-browser Supabase usage will be constrained by.
-- ──────────────────────────────────────────────────────────

create policy "subscribers_rw" on public.subscribers
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "fields_rw" on public.fields
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "groups_rw" on public.groups
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "subscriber_groups_rw" on public.subscriber_groups
  for all using (
    exists (
      select 1 from public.subscribers s
      where s.id = subscriber_id and public.is_workspace_member(s.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.subscribers s
      where s.id = subscriber_id and public.is_workspace_member(s.workspace_id)
    )
  );

create policy "campaigns_rw" on public.campaigns
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "automations_rw" on public.automations
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "automation_runs_select" on public.automation_runs
  for select using (
    exists (
      select 1 from public.automations a
      where a.id = automation_id and public.is_workspace_member(a.workspace_id)
    )
  );

create policy "email_jobs_select" on public.email_jobs
  for select using (public.is_workspace_member(workspace_id));

create policy "email_events_select" on public.email_events
  for select using (
    exists (
      select 1 from public.email_jobs j
      where j.id = job_id and public.is_workspace_member(j.workspace_id)
    )
  );

create policy "sending_domains_rw" on public.sending_domains
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "api_keys_select" on public.api_keys
  for select using (public.is_workspace_member(workspace_id));

create policy "events_select" on public.events
  for select using (public.is_workspace_member(workspace_id));
