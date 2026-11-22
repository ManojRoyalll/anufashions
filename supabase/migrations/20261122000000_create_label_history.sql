-- Label history: generated/downloaded labels, shared across devices.
-- This app has no auth, so access is granted to the anon (public) role.
create table if not exists "LabelHistory" (
  id text primary key default gen_random_uuid()::text,
  variant text not null default 'code',
  name text not null default '',
  code text not null default '',
  price text not null default '',
  "sizeW" numeric(8,2) not null default 100,
  "sizeH" numeric(8,2) not null default 50,
  "sizeLabel" text not null default '',
  count integer not null default 1,
  "createdAt" timestamptz not null default now()
);

create index if not exists "LabelHistory_createdAt_idx" on "LabelHistory"("createdAt" desc);

-- Expose the table to the API roles used by the browser client.
grant select, insert, update, delete on "LabelHistory" to anon, authenticated;

alter table "LabelHistory" enable row level security;

drop policy if exists "Public select LabelHistory" on "LabelHistory";
create policy "Public select LabelHistory" on "LabelHistory"
  for select to anon, authenticated using (true);

drop policy if exists "Public insert LabelHistory" on "LabelHistory";
create policy "Public insert LabelHistory" on "LabelHistory"
  for insert to anon, authenticated with check (true);

drop policy if exists "Public update LabelHistory" on "LabelHistory";
create policy "Public update LabelHistory" on "LabelHistory"
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "Public delete LabelHistory" on "LabelHistory";
create policy "Public delete LabelHistory" on "LabelHistory"
  for delete to anon, authenticated using (true);
