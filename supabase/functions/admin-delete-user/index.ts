// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid or expired admin token')
    }

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (adminError || !adminUser || adminUser.role !== 'admin' || !adminUser.is_active) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only active admins can perform user deletion' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 2. Parse request body
    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('Missing required field: userId')
    }

    // Prevent deleting oneself
    if (userId === user.id) {
      throw new Error('Cannot delete your own admin account')
    }

    // 3. Delete from public.users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (dbError) {
      if (dbError.code === '23503' || dbError.message?.includes('foreign key constraint')) {
        throw new Error('Cannot permanently delete this staff member because they have associated records (such as jobs, payments, attendance, or customer ledger logs). Please deactivate them instead to disable access while preserving financial records.')
      }
      throw new Error('Failed to delete user record: ' + dbError.message)
    }

    // 4. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      // It's possible the user wasn't in Auth but was in public.users, so we still return success if DB succeeded
      console.error('Failed to delete auth user, but DB user was deleted:', authError)
    }

    return new Response(JSON.stringify({ success: true }), {
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
