create sequence if not exists sale_code_seq start 1;

create or replace function public.generate_sale_code()
returns text as $$
declare
  next_val int;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('sale_code_seq');
  return 'SALE-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$ language plpgsql;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_code text unique not null,
  customer_name text not null,
  customer_contact text not null,
  customer_email text,
  status text check (status in ('Draft','Paid','Cancelled')) not null default 'Paid',
  payment_method text check (payment_method in ('Cash','Card','UPI','Bank Transfer','Other')) not null default 'Cash',
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  tax_percent numeric not null default 0,
  total_amount numeric not null default 0,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  paid_at timestamptz
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  item_name text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric generated always as (quantity * unit_price) stored
);

create or replace function public.recalculate_sale_totals()
returns trigger as $$
declare
  target_sale_id uuid;
  current_subtotal numeric;
begin
  target_sale_id := coalesce(new.sale_id, old.sale_id);

  select coalesce(sum(line_total), 0)
  into current_subtotal
  from public.sale_items
  where sale_id = target_sale_id;

  update public.sales
  set
    subtotal = current_subtotal,
    total_amount = greatest((current_subtotal - discount) + ((current_subtotal - discount) * tax_percent / 100), 0)
  where id = target_sale_id;

  return null;
end;
$$ language plpgsql;

drop trigger if exists sale_items_recalculate_totals on public.sale_items;
create trigger sale_items_recalculate_totals
after insert or update or delete on public.sale_items
for each row execute function public.recalculate_sale_totals();

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "Admins and Receptionists have full access to sales" on public.sales;
create policy "Admins and Receptionists have full access to sales" on public.sales
  for all to authenticated
  using (public.is_admin() or public.is_receptionist())
  with check (public.is_admin() or public.is_receptionist());

drop policy if exists "Admins and Receptionists have full access to sale_items" on public.sale_items;
create policy "Admins and Receptionists have full access to sale_items" on public.sale_items
  for all to authenticated
  using (
    public.is_admin() or public.is_receptionist()
  )
  with check (
    public.is_admin() or public.is_receptionist()
  );
