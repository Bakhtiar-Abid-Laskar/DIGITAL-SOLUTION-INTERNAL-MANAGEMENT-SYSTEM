create policy "Users can view their own attendance"
on public.attendance for select 
using (auth.uid() = user_id);

create policy "Users can insert their own attendance"
on public.attendance for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own attendance"
on public.attendance for update 
using (auth.uid() = user_id);
