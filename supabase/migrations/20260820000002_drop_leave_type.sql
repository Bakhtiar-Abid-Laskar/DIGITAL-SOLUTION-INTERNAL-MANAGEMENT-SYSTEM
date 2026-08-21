-- Drop the leave_type column from employee_leave
alter table public.employee_leave drop column if exists leave_type;
