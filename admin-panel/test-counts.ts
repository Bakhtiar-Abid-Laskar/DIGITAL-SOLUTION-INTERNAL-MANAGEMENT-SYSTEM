import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/Digital Solution/admin-panel/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// use service role key if needed to bypass RLS, but let's try anon first
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { count: salesCount, error: err1 } = await supabase.from('sales').select('*', { count: 'exact', head: true });
  console.log("Sales count:", salesCount, err1);

  const { count: invoicesCount, error: err2 } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
  console.log("Invoices count:", invoicesCount, err2);
}

test();
