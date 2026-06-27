-- Drop old ledger tables (replaced by simpler khata model)
drop table if exists "LedgerPayment";
drop table if exists "LedgerEntry";

-- Khata customers (running account per customer)
create table if not exists "KhataCustomer" (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text,
  balance numeric(12,2) not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Every purchase or payment is one transaction row
create table if not exists "KhataTransaction" (
  id text primary key default gen_random_uuid()::text,
  "customerId" text not null references "KhataCustomer"(id) on delete cascade,
  type text not null check (type in ('PURCHASE','PAYMENT')),
  amount numeric(12,2) not null,
  items jsonb not null default '[]'::jsonb,
  note text,
  "txDate" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

create index if not exists "KhataCustomer_name_idx" on "KhataCustomer"(name);
create index if not exists "KhataTransaction_customerId_idx" on "KhataTransaction"("customerId");
create index if not exists "KhataTransaction_txDate_idx" on "KhataTransaction"("txDate" desc);

-- RLS
alter table "KhataCustomer" enable row level security;
alter table "KhataTransaction" enable row level security;

drop policy if exists "Auth all KhataCustomer" on "KhataCustomer";
create policy "Auth all KhataCustomer" on "KhataCustomer" for all to authenticated using (true) with check (true);
drop policy if exists "Auth all KhataTransaction" on "KhataTransaction";
create policy "Auth all KhataTransaction" on "KhataTransaction" for all to authenticated using (true) with check (true);
