# API ANALYSIS

### `POST /functions/v1/calculate-monthly-salary`
- **Caller**: Admin Panel (`SalaryCalculatorForm.tsx`)
- **Headers**: `Authorization: Bearer <session_jwt>`
- **Body**: `{ user_id: string, month: number, year: number }`
- **Security**: Verifies caller has Admin role. Uses Service Role internally.
- **Returns**: `{ success: true, data: SalaryRecord }`
