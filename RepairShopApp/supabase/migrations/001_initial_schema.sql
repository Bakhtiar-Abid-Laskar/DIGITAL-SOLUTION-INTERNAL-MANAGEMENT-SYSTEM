create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  role text check (role in ('admin','receptionist','technician')) not null,
  is_active boolean default false,
  expo_push_token text,
  created_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text unique not null,
  customer_name text not null,
  customer_contact text not null,
  customer_email text,
  device_type text check (device_type in ('Laptop','PC','Other')) not null,
  reported_issue text not null,
  remarks text,
  work_notes text,
  job_type text check (job_type in ('Inhouse','Onsite')) default 'Inhouse',
  priority text check (priority in ('Normal','High','Urgent')) default 'Normal',
  status text check (status in ('Received','In Progress','Waiting for Materials','Completed')) default 'Received',
  receptionist_id uuid references users(id),
  technician_id uuid references users(id),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create sequence job_code_seq start 1;

create or replace function generate_job_code()
returns text as $$
declare
  next_val int;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('job_code_seq');
  return 'RS-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$ language plpgsql;

create table job_materials (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  material_name text not null,
  quantity numeric not null,
  unit_cost numeric not null,
  total_cost numeric generated always as (quantity * unit_cost) stored
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  selfie_url text,
  gps_lat numeric,
  gps_lng numeric,
  ot_hours numeric default 0,
  early_hours numeric default 0,
  status text check (status in ('Present','Halfday','Leave','Absent')) default 'Present',
  approved_by uuid references users(id),
  unique(user_id, date)
);

create table onsite_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  technician_id uuid references users(id),
  arrival_selfie_url text,
  arrival_time timestamptz,
  arrival_gps_lat numeric,
  arrival_gps_lng numeric,
  departure_selfie_url text,
  departure_time timestamptz,
  departure_gps_lat numeric,
  departure_gps_lng numeric
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  quantity numeric default 0,
  unit text,
  low_stock_threshold numeric default 5,
  last_updated timestamptz default now()
);

create table billing (
  id uuid primary key default gen_random_uuid(),
  job_id uuid unique references jobs(id),
  parts_total numeric default 0,
  labour_charge numeric default 0,
  tax_percent numeric default 0,
  discount numeric default 0,
  grand_total numeric,
  is_paid boolean default false,
  invoice_url text,
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('advance_salary','materials_purchase','daily_expenditure','office_development')) not null,
  amount numeric not null,
  description text,
  user_id uuid references users(id),
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table staff_rates (
  user_id uuid primary key references users(id),
  base_daily_rate numeric not null,
  ot_rate_per_hour numeric default 0,
  early_deduction_per_hour numeric default 0
);

create table salary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  month date not null,
  base_daily_rate numeric not null,
  working_days integer not null,
  present_days integer default 0,
  halfday_count integer default 0,
  leave_count integer default 0,
  ot_hours numeric default 0,
  ot_rate_per_hour numeric default 0,
  early_hours numeric default 0,
  early_deduction_per_hour numeric default 0,
  advance_deducted numeric default 0,
  gross_salary numeric,
  net_salary numeric,
  unique(user_id, month)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  recipient_user_id uuid references users(id),
  channel text check (channel in ('push','whatsapp','email')) not null,
  message text not null,
  sent_at timestamptz,
  status text check (status in ('pending','sent','failed')) default 'pending'
);
