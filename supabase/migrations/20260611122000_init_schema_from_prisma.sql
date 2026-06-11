create extension if not exists pgcrypto;

do $$
begin
	if not exists (select 1 from pg_type where typname = 'UserRole') then
		create type "UserRole" as enum ('ADMIN');
	end if;

	if not exists (select 1 from pg_type where typname = 'Status') then
		create type "Status" as enum ('ACTIVE', 'INACTIVE');
	end if;

	if not exists (select 1 from pg_type where typname = 'StockStatus') then
		create type "StockStatus" as enum ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');
	end if;

	if not exists (select 1 from pg_type where typname = 'PaymentMethod') then
		create type "PaymentMethod" as enum ('CASH', 'UPI', 'CARD');
	end if;

	if not exists (select 1 from pg_type where typname = 'ExpenseType') then
		create type "ExpenseType" as enum ('RENT', 'ELECTRICITY', 'TRANSPORT', 'MARKETING', 'SALARY', 'PACKAGING', 'MISC');
	end if;
end $$;

create table if not exists "User" (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	email text not null unique,
	"passwordHash" text not null,
	role "UserRole" not null default 'ADMIN',
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now()
);

create table if not exists "Category" (
	id text primary key default gen_random_uuid()::text,
	name text not null unique,
	description text,
	status "Status" not null default 'ACTIVE',
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now()
);

create table if not exists "PriceRange" (
	id text primary key default gen_random_uuid()::text,
	name text not null unique,
	"minPrice" numeric(12, 2) not null,
	"maxPrice" numeric(12, 2) not null,
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now()
);

create table if not exists "Supplier" (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	phone text,
	email text,
	address text,
	"productsSupplied" text,
	"outstandingPayments" numeric(12, 2) not null default 0,
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now()
);

create table if not exists "Customer" (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	phone text unique,
	address text,
	"favoriteCategories" text,
	"totalSpend" numeric(12, 2) not null default 0,
	"lifetimeValue" numeric(12, 2) not null default 0,
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now()
);

create table if not exists "Product" (
	id text primary key default gen_random_uuid()::text,
	code text not null unique,
	barcode text unique,
	name text not null,
	"categoryId" text not null,
	"supplierId" text,
	"priceRangeId" text,
	"discountLimit" double precision,
	"purchasePrice" numeric(12, 2) not null,
	"sellingPrice" numeric(12, 2) not null,
	mrp numeric(12, 2),
	color text,
	size text,
	material text,
	quantity integer not null default 0,
	"imageUrl" text,
	"datePurchased" timestamptz,
	"stockStatus" "StockStatus" not null default 'IN_STOCK',
	notes text,
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now(),
	constraint "Product_categoryId_fkey" foreign key ("categoryId") references "Category" (id),
	constraint "Product_supplierId_fkey" foreign key ("supplierId") references "Supplier" (id),
	constraint "Product_priceRangeId_fkey" foreign key ("priceRangeId") references "PriceRange" (id)
);

create table if not exists "Purchase" (
	id text primary key default gen_random_uuid()::text,
	"purchaseDate" timestamptz not null,
	"supplierId" text not null,
	"invoiceNo" text not null,
	"totalAmount" numeric(12, 2) not null,
	"invoiceBillAmount" numeric(12, 2),
	"transportCost" numeric(12, 2) not null default 0,
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now(),
	constraint "Purchase_supplierId_fkey" foreign key ("supplierId") references "Supplier" (id)
);

create table if not exists "PurchaseItem" (
	id text primary key default gen_random_uuid()::text,
	"purchaseId" text not null,
	"productId" text not null,
	quantity integer not null,
	"costPrice" numeric(12, 2) not null,
	"lineTotal" numeric(12, 2) not null,
	"createdAt" timestamptz not null default now(),
	constraint "PurchaseItem_purchaseId_fkey" foreign key ("purchaseId") references "Purchase" (id),
	constraint "PurchaseItem_productId_fkey" foreign key ("productId") references "Product" (id)
);

create table if not exists "Sale" (
	id text primary key default gen_random_uuid()::text,
	"saleDate" timestamptz not null,
	"customerId" text,
	"paymentMethod" "PaymentMethod" not null,
	discount numeric(12, 2) not null default 0,
	gst numeric(12, 2) not null default 0,
	"totalAmount" numeric(12, 2) not null,
	revenue numeric(12, 2) not null,
	cogs numeric(12, 2) not null,
	"grossProfit" numeric(12, 2) not null,
	"netProfit" numeric(12, 2) not null,
	"marginPercent" numeric(7, 2) not null,
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now(),
	constraint "Sale_customerId_fkey" foreign key ("customerId") references "Customer" (id)
);

create table if not exists "SaleItem" (
	id text primary key default gen_random_uuid()::text,
	"saleId" text not null,
	"productId" text not null,
	quantity integer not null,
	"unitPrice" numeric(12, 2) not null,
	"purchasePrice" numeric(12, 2) not null,
	"lineTotal" numeric(12, 2) not null,
	"createdAt" timestamptz not null default now(),
	constraint "SaleItem_saleId_fkey" foreign key ("saleId") references "Sale" (id),
	constraint "SaleItem_productId_fkey" foreign key ("productId") references "Product" (id)
);

create table if not exists "Expense" (
	id text primary key default gen_random_uuid()::text,
	date timestamptz not null,
	type "ExpenseType" not null,
	amount numeric(12, 2) not null,
	description text,
	"createdAt" timestamptz not null default now(),
	"updatedAt" timestamptz not null default now()
);

create table if not exists "BusinessMetric" (
	id text primary key default gen_random_uuid()::text,
	"totalInvestment" numeric(12, 2) not null default 0,
	"totalProfit" numeric(12, 2) not null default 0,
	"totalRevenue" numeric(12, 2) not null default 0,
	"updatedAt" timestamptz not null default now()
);

create index if not exists "Supplier_name_idx" on "Supplier" (name);
create index if not exists "Customer_name_idx" on "Customer" (name);
create index if not exists "Product_name_idx" on "Product" (name);
create index if not exists "Product_categoryId_idx" on "Product" ("categoryId");
create index if not exists "Purchase_purchaseDate_idx" on "Purchase" ("purchaseDate");
create index if not exists "Sale_saleDate_idx" on "Sale" ("saleDate");
create index if not exists "Expense_date_idx" on "Expense" (date);
