# STATE MANAGEMENT

- **Global**: `AuthContext` (stores session and role).
- **Local**: React `useState` handles form data and loading states.
- **Persistence**: Supabase handles data persistence. Session persisted via AsyncStorage (mobile).
