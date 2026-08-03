# PERFORMANCE AUDIT

- **Image Uploads**: Selfies are compressed via Expo Camera quality settings before upload to reduce latency.
- **Database**: `attendance` date and user_id should be indexed for fast aggregation during payroll.
- **Calculations**: Handled server-side (Edge Functions) to prevent client CPU blockage on large aggregations.
