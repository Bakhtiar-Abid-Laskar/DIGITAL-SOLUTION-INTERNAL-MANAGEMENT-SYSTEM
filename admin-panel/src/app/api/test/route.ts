import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Fetch an actual row to see what columns exist
  const res = await fetch(`${url}/rest/v1/invoice_items?limit=1&select=*`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  return new NextResponse(text, { 
    status: res.status, 
    headers: { 'Content-Type': 'application/json' } 
  });
}
