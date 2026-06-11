-- Create a public storage bucket for bill photos
insert into storage.buckets (id, name, public)
values ('bill-photos', 'bill-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
drop policy if exists "Authenticated users can upload bill photos" on storage.objects;
create policy "Authenticated users can upload bill photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'bill-photos');

-- Allow public read
drop policy if exists "Public can read bill photos" on storage.objects;
create policy "Public can read bill photos"
on storage.objects for select to public
using (bucket_id = 'bill-photos');

-- Allow authenticated users to delete
drop policy if exists "Authenticated users can delete bill photos" on storage.objects;
create policy "Authenticated users can delete bill photos"
on storage.objects for delete to authenticated
using (bucket_id = 'bill-photos');
