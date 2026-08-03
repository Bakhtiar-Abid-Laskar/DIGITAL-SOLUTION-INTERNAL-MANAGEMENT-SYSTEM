# Remaining Issues

While the core functionality and previously identified Critical/High/Medium bugs have been addressed, the following items remain as outstanding or optional improvements:

## Optional / Advanced Features

### 1. Live Background Technician GPS Tracking
- **Status:** Skipped
- **Reason:** The original workflow PDF requests live GPS tracking on a map. Implementing true background location tracking in Expo requires the `expo-location` background permissions, OS-level battery exception requests, and a robust background task manager (like `expo-task-manager`). This was deemed too invasive for privacy and too complex for a standard V1 deployment.
- **Current Mitigation:** The system tracks location *episodically* via the `onsite_visits` table when the technician actively clicks "Arrival" or "Departure" selfies.

### 2. Deep Linking for WhatsApp & Push Notifications
- **Status:** Unimplemented
- **Reason:** Currently, tapping a push notification or WhatsApp URL opens the app but does not route directly into the specific job ID detail screen. Setting up Expo Router / React Navigation deep linking requires configuring the `app.json` scheme and URL parsing. 

### 3. Inventory Stock Alerts System
- **Status:** Partially Implemented
- **Reason:** Admin can view inventory, but there is no automated trigger (e.g., cron-job or database trigger) to alert the Receptionist/Admin when a specific part drops below a minimum threshold.

### 4. Salary Advance Rolling Deductions
- **Status:** Manual
- **Reason:** The salary formula deducts `advance_salary` payments for the *current month* only. If an advance is larger than the month's net salary, the remainder does not automatically roll over as a debt to the next month. This would require an additional `staff_debt` ledger table.

## Minor UI Edge Cases
- **Printer Compatibility:** The current `expo-print` implementation generates an A4 HTML document. If the user intends to use a thermal Bluetooth printer (like a 58mm receipt printer), the HTML CSS may need strict `width: 58mm` constraints.
