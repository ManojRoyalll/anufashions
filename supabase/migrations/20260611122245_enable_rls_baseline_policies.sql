alter table "User" enable row level security;
alter table "Category" enable row level security;
alter table "PriceRange" enable row level security;
alter table "Supplier" enable row level security;
alter table "Customer" enable row level security;
alter table "Product" enable row level security;
alter table "Purchase" enable row level security;
alter table "PurchaseItem" enable row level security;
alter table "Sale" enable row level security;
alter table "SaleItem" enable row level security;
alter table "Expense" enable row level security;
alter table "BusinessMetric" enable row level security;

drop policy if exists "Authenticated users can select User" on "User";
create policy "Authenticated users can select User"
on "User" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert User" on "User";
create policy "Authenticated users can insert User"
on "User" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update User" on "User";
create policy "Authenticated users can update User"
on "User" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete User" on "User";
create policy "Authenticated users can delete User"
on "User" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select Category" on "Category";
create policy "Authenticated users can select Category"
on "Category" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert Category" on "Category";
create policy "Authenticated users can insert Category"
on "Category" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update Category" on "Category";
create policy "Authenticated users can update Category"
on "Category" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete Category" on "Category";
create policy "Authenticated users can delete Category"
on "Category" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select PriceRange" on "PriceRange";
create policy "Authenticated users can select PriceRange"
on "PriceRange" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert PriceRange" on "PriceRange";
create policy "Authenticated users can insert PriceRange"
on "PriceRange" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update PriceRange" on "PriceRange";
create policy "Authenticated users can update PriceRange"
on "PriceRange" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete PriceRange" on "PriceRange";
create policy "Authenticated users can delete PriceRange"
on "PriceRange" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select Supplier" on "Supplier";
create policy "Authenticated users can select Supplier"
on "Supplier" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert Supplier" on "Supplier";
create policy "Authenticated users can insert Supplier"
on "Supplier" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update Supplier" on "Supplier";
create policy "Authenticated users can update Supplier"
on "Supplier" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete Supplier" on "Supplier";
create policy "Authenticated users can delete Supplier"
on "Supplier" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select Customer" on "Customer";
create policy "Authenticated users can select Customer"
on "Customer" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert Customer" on "Customer";
create policy "Authenticated users can insert Customer"
on "Customer" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update Customer" on "Customer";
create policy "Authenticated users can update Customer"
on "Customer" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete Customer" on "Customer";
create policy "Authenticated users can delete Customer"
on "Customer" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select Product" on "Product";
create policy "Authenticated users can select Product"
on "Product" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert Product" on "Product";
create policy "Authenticated users can insert Product"
on "Product" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update Product" on "Product";
create policy "Authenticated users can update Product"
on "Product" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete Product" on "Product";
create policy "Authenticated users can delete Product"
on "Product" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select Purchase" on "Purchase";
create policy "Authenticated users can select Purchase"
on "Purchase" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert Purchase" on "Purchase";
create policy "Authenticated users can insert Purchase"
on "Purchase" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update Purchase" on "Purchase";
create policy "Authenticated users can update Purchase"
on "Purchase" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete Purchase" on "Purchase";
create policy "Authenticated users can delete Purchase"
on "Purchase" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select PurchaseItem" on "PurchaseItem";
create policy "Authenticated users can select PurchaseItem"
on "PurchaseItem" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert PurchaseItem" on "PurchaseItem";
create policy "Authenticated users can insert PurchaseItem"
on "PurchaseItem" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update PurchaseItem" on "PurchaseItem";
create policy "Authenticated users can update PurchaseItem"
on "PurchaseItem" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete PurchaseItem" on "PurchaseItem";
create policy "Authenticated users can delete PurchaseItem"
on "PurchaseItem" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select Sale" on "Sale";
create policy "Authenticated users can select Sale"
on "Sale" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert Sale" on "Sale";
create policy "Authenticated users can insert Sale"
on "Sale" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update Sale" on "Sale";
create policy "Authenticated users can update Sale"
on "Sale" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete Sale" on "Sale";
create policy "Authenticated users can delete Sale"
on "Sale" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select SaleItem" on "SaleItem";
create policy "Authenticated users can select SaleItem"
on "SaleItem" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert SaleItem" on "SaleItem";
create policy "Authenticated users can insert SaleItem"
on "SaleItem" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update SaleItem" on "SaleItem";
create policy "Authenticated users can update SaleItem"
on "SaleItem" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete SaleItem" on "SaleItem";
create policy "Authenticated users can delete SaleItem"
on "SaleItem" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select Expense" on "Expense";
create policy "Authenticated users can select Expense"
on "Expense" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert Expense" on "Expense";
create policy "Authenticated users can insert Expense"
on "Expense" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update Expense" on "Expense";
create policy "Authenticated users can update Expense"
on "Expense" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete Expense" on "Expense";
create policy "Authenticated users can delete Expense"
on "Expense" for delete to authenticated using (true);

drop policy if exists "Authenticated users can select BusinessMetric" on "BusinessMetric";
create policy "Authenticated users can select BusinessMetric"
on "BusinessMetric" for select to authenticated using (true);

drop policy if exists "Authenticated users can insert BusinessMetric" on "BusinessMetric";
create policy "Authenticated users can insert BusinessMetric"
on "BusinessMetric" for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update BusinessMetric" on "BusinessMetric";
create policy "Authenticated users can update BusinessMetric"
on "BusinessMetric" for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete BusinessMetric" on "BusinessMetric";
create policy "Authenticated users can delete BusinessMetric"
on "BusinessMetric" for delete to authenticated using (true);
