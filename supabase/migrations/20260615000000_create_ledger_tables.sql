-- Ledger / Khata Book tables
create table if not exists "LedgerEntry" (
  id text primary key default gen_random_uuid()::text,
  "entryDate" timestamptz not null default now(),
  "customerId" text references "Customer"(id) on delete set null,
  "customerName" text not null,
  "customerPhone" text,
  items jsonb not null default '[]'::jsonb,
  "totalBill" numeric(12,2) not null default 0,
  "totalPaid" numeric(12,2) not null default 0,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "LedgerPayment" (
  id text primary key default gen_random_uuid()::text,
  "entryId" text not null references "LedgerEntry"(id) on delete cascade,
  amount numeric(12,2) not null,
  "paymentDate" timestamptz not null default now(),
  note text,
  "createdAt" timestamptz not null default now()
);

create index if not exists "LedgerEntry_entryDate_idx" on "LedgerEntry"("entryDate" desc);
create index if not exists "LedgerPayment_entryId_idx" on "LedgerPayment"("entryId");

alter table "LedgerEntry" enable row level security;
alter table "LedgerPayment" enable row level security;

drop policy if exists "Auth select LedgerEntry" on "LedgerEntry";
create policy "Auth select LedgerEntry" on "LedgerEntry" for select to authenticated using (true);
drop policy if exists "Auth insert LedgerEntry" on "LedgerEntry";
create policy "Auth insert LedgerEntry" on "LedgerEntry" for insert to authenticated with check (true);
drop policy if exists "Auth update LedgerEntry" on "LedgerEntry";
create policy "Auth update LedgerEntry" on "LedgerEntry" for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete LedgerEntry" on "LedgerEntry";
create policy "Auth delete LedgerEntry" on "LedgerEntry" for delete to authenticated using (true);

drop policy if exists "Auth select LedgerPayment" on "LedgerPayment";
create policy "Auth select LedgerPayment" on "LedgerPayment" for select to authenticated using (true);
drop policy if exists "Auth insert LedgerPayment" on "LedgerPayment";
create policy "Auth insert LedgerPayment" on "LedgerPayment" for insert to authenticated with check (true);
drop policy if exists "Auth delete LedgerPayment" on "LedgerPayment";
create policy "Auth delete LedgerPayment" on "LedgerPayment" for delete to authenticated using (true);
