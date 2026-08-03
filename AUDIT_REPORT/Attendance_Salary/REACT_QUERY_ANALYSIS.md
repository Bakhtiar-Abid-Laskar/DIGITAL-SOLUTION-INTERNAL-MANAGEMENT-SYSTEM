# DATA FETCHING ANALYSIS

- No dedicated React Query hooks used. Relies on standard `useEffect` and direct Supabase JS Client calls.
- **Invalidation Strategy**: Manual local state updates or re-fetching upon mutation success.
