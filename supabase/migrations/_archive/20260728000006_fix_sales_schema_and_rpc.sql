-- Migration: 20260728000006_fix_sales_schema_and_rpc.sql
-- Description: Comprehensive fix for sales & sale_items tables, sequence, generate_sale_code() RPC, triggers, and column constraint compatibility.

-- 1. Create Sequence for Sale Code Generation
create sequence if not exists public.sale_code_seq start with 1 increment by 1;

-- 2. Create RPC function generate_sale_code()
create or replace function public.generate_sale_code()
returns text as $$
declare
  next_val bigint;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('public.sale_code_seq');
  return 'SALE-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$ language plpgsql volatile security definer;

-- 3. Ensure public.sales table exists
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_code text unique default public.generate_sale_code(),
  invoice_number text default public.generate_sale_code(),
  customer_name text not null,
  customer_contact text,
  customer_email text,
  customer_gstin text,
  status text check (status in ('Draft', 'Paid', 'Cancelled')) default 'Paid',
  payment_method text check (payment_method in ('Cash', 'Card', 'UPI', 'Bank Transfer', 'Other', 'cash', 'online', 'card', 'upi')) default 'Cash',
  payment_mode text default 'cash',
  subtotal numeric default 0,
  discount numeric default 0,
  tax_percent numeric default 0,
  total_amount numeric default 0,
  grand_total numeric default 0,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  paid_at timestamptz,
  sale_type_id uuid references public.sale_types(id),
  snap_receptionist_incentive numeric default 0
);

-- Ensure all missing columns exist and drop strict NOT NULL on legacy columns
alter table public.sales
  add column if not exists sale_code text default public.generate_sale_code(),
  add column if not exists invoice_number text default public.generate_sale_code(),
  add column if not exists customer_contact text,
  add column if not exists customer_email text,
  add column if not exists customer_gstin text,
  add column if not exists status text check (status in ('Draft', 'Paid', 'Cancelled')) default 'Paid',
  add column if not exists payment_method text default 'Cash',
  add column if not exists payment_mode text default 'cash',
  add column if not exists subtotal numeric default 0,
  add column if not exists discount numeric default 0,
  add column if not exists tax_percent numeric default 0,
  add column if not exists total_amount numeric default 0,
  add column if not exists grand_total numeric default 0,
  add column if not exists notes text,
  add column if not exists created_by uuid references public.users(id),
  add column if not exists paid_at timestamptz,
  add column if not exists sale_type_id uuid references public.sale_types(id),
  add column if not exists snap_receptionist_incentive numeric default 0;

-- Drop strict NOT NULL constraint on invoice_number if present from master schema
alter table public.sales alter column invoice_number drop not null;
alter table public.sales alter column invoice_number set default public.generate_sale_code();
alter table public.sales alter column sale_code set default public.generate_sale_code();

-- 4. Sync trigger for sale_code and invoice_number
create or replace function public.sync_sale_code_and_invoice()
returns trigger as $$
begin
  if new.sale_code is null and new.invoice_number is not null then
    new.sale_code := new.invoice_number;
  elsif new.invoice_number is null and new.sale_code is not null then
    new.invoice_number := new.sale_code;
  elsif new.sale_code is null and new.invoice_number is null then
    new.sale_code := public.generate_sale_code();
    new.invoice_number := new.sale_code;
  end if;

  if new.total_amount is null or new.total_amount = 0 then
    new.total_amount := coalesce(new.grand_total, 0);
  end if;
  if new.grand_total is null or new.grand_total = 0 then
    new.grand_total := coalesce(new.total_amount, 0);
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_sale_code on public.sales;
create trigger trg_sync_sale_code
before insert on public.sales
for each row execute function public.sync_sale_code_and_invoice();

-- 5. Ensure public.sale_items table exists with all required fields
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  inventory_id uuid references public.inventory(id) on delete set null,
  item_name text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric default 0,
  total_price numeric default 0
);

alter table public.sale_items
  add column if not exists inventory_id uuid references public.inventory(id) on delete set null,
  add column if not exists line_total numeric default 0,
  add column if not exists total_price numeric default 0;

-- 6. Trigger for sales recalculation
create or replace function public.recalculate_sale_totals()
returns trigger as $$
declare
  target_sale_id uuid;
  current_subtotal numeric;
  calc_total numeric;
begin
  target_sale_id := coalesce(new.sale_id, old.sale_id);

  select coalesce(sum(quantity * unit_price), 0)
  into current_subtotal
  from public.sale_items
  where sale_id = target_sale_id;

  calc_total := greatest((current_subtotal - coalesce(discount, 0)) + ((current_subtotal - coalesce(discount, 0)) * coalesce(tax_percent, 0) / 100), 0);

  update public.sales
  set
    subtotal = current_subtotal,
    total_amount = calc_total,
    grand_total = calc_total
  where id = target_sale_id;

  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists sale_items_recalculate_totals on public.sale_items;
create trigger sale_items_recalculate_totals
after insert or update or delete on public.sale_items
for each row execute function public.recalculate_sale_totals();

-- 7. Trigger for sale incentives
create or replace function public.accrue_sale_incentives()
returns trigger as $$
begin
  if (coalesce(NEW.status, 'Paid') = 'Paid' and (TG_OP = 'INSERT' or OLD.status is null or OLD.status != 'Paid')) then
    if (coalesce(NEW.snap_receptionist_incentive, 0) > 0 and NEW.created_by is not null) then
      delete from public.staff_incentives 
      where sale_id = NEW.id and role_type = 'receptionist';

      insert into public.staff_incentives (user_id, sale_id, amount, role_type, description)
      values (
        NEW.created_by,
        NEW.id,
        NEW.snap_receptionist_incentive,
        'receptionist',
        'Sale Incentive (' || coalesce(NEW.sale_code, NEW.invoice_number, 'SALE') || ')'
      );
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_accrue_sale_incentives on public.sales;
create trigger trg_accrue_sale_incentives
after insert or update on public.sales
for each row execute function public.accrue_sale_incentives();

-- 8. Enable RLS & set policies
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "sales_staff_all" on public.sales;
create policy "sales_staff_all" on public.sales
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists "sale_items_staff_all" on public.sale_items;
create policy "sale_items_staff_all" on public.sale_items
  for all to authenticated
  using (true)
  with check (true);

-- 9. Reload schema cache
notify pgrst, 'reload schema';
