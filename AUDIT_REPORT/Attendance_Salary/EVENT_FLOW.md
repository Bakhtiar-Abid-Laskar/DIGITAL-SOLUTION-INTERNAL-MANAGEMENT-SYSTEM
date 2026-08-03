# EVENT FLOW

- **Clock In Button**: Requests Hardware perms -> Captures Media -> Uploads -> DB Write.
- **Approve Salary Button**: Updates `status` in `salary` table from 'Draft' to 'Paid'.
- **Print Payslip**: Triggers HTML generation -> Browser Print Dialog or PDF export.
