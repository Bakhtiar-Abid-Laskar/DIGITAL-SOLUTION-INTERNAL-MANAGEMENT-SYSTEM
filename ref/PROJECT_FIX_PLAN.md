# RepairShop — Fix Plan

The project is in an excellent, production-ready state following the Phase 9 RLS hardening. There are zero Critical or High priority fixes required. 

This fix plan consists only of minor cleanup tasks (Low Priority).

## Cleanup Tasks (Low Priority)

### 1. Remove Dead Code
- **File**: `RepairShopApp/src/screens/receptionist/BillingPlaceholderScreen.tsx`
- **Action**: Delete file.
- **Why**: Was replaced by the actual `BillingScreen.tsx` during Phase 7. Leaving it in creates clutter.
- **Effort**: 1 minute.

### 2. Edge Function Log Schema Alignment (Optional Polish)
- **File**: `RepairShopApp/supabase/functions/send-invoice-email/index.ts`
- **Action**: Update the notification logging block to use `channel` and `message` columns instead of `type` and `title` to perfectly match the `notifications` table schema.
- **Why**: Currently wrapped in a `catch(() => {})`, so it doesn't break the invoice sending, but the log entry silently fails to insert.
- **Effort**: 5 minutes.

## Suggested Execution Order
1. Delete `BillingPlaceholderScreen.tsx`.
2. Update the `logNotificationAttempt` call inside `send-invoice-email/index.ts`.

*(Do not execute these fixes until explicitly approved by the User.)*
