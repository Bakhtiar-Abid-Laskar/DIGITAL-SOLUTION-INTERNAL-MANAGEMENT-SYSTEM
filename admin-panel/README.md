# RepairShop Admin Panel

This is the web-based Admin Panel for the RepairShop Service Management System.

## Technologies Used
- Next.js (App Router)
- React
- TypeScript
- Supabase JS Client
- Recharts (for charts)
- Lucide React (for icons)
- Plain CSS Modules

## Installation

1. Navigate to the `admin-panel` folder:
   ```bash
   cd admin-panel
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Create a `.env.local` file in the `admin-panel` root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Running Locally

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Use the **Admin** account credentials you created during Phase 1 to log in.

## Building for Production

To build the app for production:

```bash
npm run build
```

To run the built app:

```bash
npm run start
```

## Deployment

This app is fully compatible with Vercel. 
Simply push this directory to a GitHub repository and import it into Vercel. Ensure you add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Vercel Environment Variables before deploying.
