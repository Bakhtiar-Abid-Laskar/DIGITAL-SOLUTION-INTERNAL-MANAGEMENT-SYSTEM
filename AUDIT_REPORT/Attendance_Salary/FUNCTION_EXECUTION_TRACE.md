# FUNCTION TRACE

### `handleCalculate()` in SalaryCalculatorForm
1. Validates inputs.
2. Sets `isLoading(true)`.
3. Calls `supabase.auth.getSession()`.
4. Executes `fetch('/functions/v1/calculate-monthly-salary')`.
5. Awaits JSON response.
6. Updates `salaryList` state on success.
7. Shows toast notification.
