-- Harden LabelHistory: remove public (anon) access and restrict to the single
-- owner account. Even a valid anon key or any other signed-up user cannot read
-- or write the data.

-- Remove the previous open policies
drop policy if exists "Public select LabelHistory" on "LabelHistory";
drop policy if exists "Public insert LabelHistory" on "LabelHistory";
drop policy if exists "Public update LabelHistory" on "LabelHistory";
drop policy if exists "Public delete LabelHistory" on "LabelHistory";

-- Revoke table access from the anonymous role entirely
revoke all on "LabelHistory" from anon;
grant select, insert, update, delete on "LabelHistory" to authenticated;

-- Only the owner account (matched by email) may access the data
drop policy if exists "Owner select LabelHistory" on "LabelHistory";
create policy "Owner select LabelHistory" on "LabelHistory"
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'anufashions@gmail.com');

drop policy if exists "Owner insert LabelHistory" on "LabelHistory";
create policy "Owner insert LabelHistory" on "LabelHistory"
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'anufashions@gmail.com');

drop policy if exists "Owner update LabelHistory" on "LabelHistory";
create policy "Owner update LabelHistory" on "LabelHistory"
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'anufashions@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'anufashions@gmail.com');

drop policy if exists "Owner delete LabelHistory" on "LabelHistory";
create policy "Owner delete LabelHistory" on "LabelHistory"
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'anufashions@gmail.com');
