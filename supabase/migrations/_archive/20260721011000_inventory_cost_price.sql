alter table public.inventory
add column if not exists cost_price numeric not null default 0;
