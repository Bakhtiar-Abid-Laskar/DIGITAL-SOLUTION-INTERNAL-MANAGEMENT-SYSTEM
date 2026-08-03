// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

declare const Deno: any;

const allowedOrigin = Deno.env.get('ADMIN_URL') || 'http://localhost:3000';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // 1. Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a regular client to verify the user token
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || supabaseKey)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // We must check if the caller is an admin in the public.users table
    // However, it's safer to use the service role key to check this.
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (adminError || !adminUser || adminUser.role !== 'admin' || !adminUser.is_active) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 2. Parse request body
    const { email, password, name, phone, role } = await req.json()
    
    if (!email || !password || !name || !role) {
      throw new Error('Missing required fields')
    }

    // 3. Create the user via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    })

    if (createError || !newUser.user) {
      throw new Error('Failed to create user in Auth: ' + (createError?.message || 'Unknown error'))
    }

    // 4. Insert into public.users
    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: newUser.user.id,
      name,
      email,
      phone: phone || null,
      role,
      is_active: true
    })

    if (insertError) {
      // Cleanup auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error('Failed to insert user profile: ' + insertError.message)
    }

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
