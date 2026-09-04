-- Drop old overloaded search_customers functions to prevent PGRST203 error
DROP FUNCTION IF EXISTS public.search_customers(text);
DROP FUNCTION IF EXISTS public.search_customers(text, integer);
