# COMPONENT EXECUTION TREE

```
(Admin) Salary Page
├── AppHeader
├── SalaryBreakdownCard
│   └── (Fetches individual salary history)
├── AdvanceSalaryForm
│   └── (Inserts into payments table)
└── SalaryCalculatorForm
    └── (Calls Edge Function)
```
