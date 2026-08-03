# KNOWN ISSUES

1. **Bug**: Missing GPS on device fallback.
   - **Impact**: Clock-in fails if GPS is completely unavailable indoors.
   - **Recommendation**: Add a short timeout to Location tracking, fallback to lower accuracy.
2. **Timezone Skew**:
   - **Location**: `date` casting in Postgres.
   - **Recommendation**: Ensure edge functions process dates strictly in IST (+05:30) as required by RepairShop rules.
