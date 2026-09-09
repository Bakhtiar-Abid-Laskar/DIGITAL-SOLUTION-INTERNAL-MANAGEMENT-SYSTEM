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
    const body = await req.json()
    const { userId, action = 'delete' } = body
    
    if (!userId) {
      throw new Error('Missing required field: userId')
    }

    // Prevent deleting or deactivating oneself
    if (userId === user.id && (action === 'delete' || action === 'deactivate')) {
      throw new Error('Cannot deactivate or delete your own admin account')
    }

    // 3. Attempt shared RPC admin_manage_staff_status first
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('admin_manage_staff_status', {
      p_user_id: userId,
      p_action: action
    })

    if (!rpcError && rpcData) {
      // Ensure Supabase Auth status matches DB state
      if (rpcData.action === 'deactivated') {
        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
          await supabaseAdmin.auth.admin.signOut(userId)
        } catch (authErr) {
          console.error('Auth ban warning:', authErr)
        }
      } else if (rpcData.action === 'deleted') {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId)
        } catch (authErr) {
          console.error('Auth delete warning:', authErr)
        }
      } else if (rpcData.action === 'activated') {
        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
        } catch (authErr) {
          console.error('Auth unban warning:', authErr)
        }
      }

      return new Response(JSON.stringify(rpcData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Fallback execution if RPC is not yet applied to database
    if (action === 'activate') {
      const { error: activateErr } = await supabaseAdmin
        .from('users')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (activateErr) throw activateErr
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      } catch (e) {
        console.error('Auth unban fallback error:', e)
      }

      return new Response(JSON.stringify({ success: true, action: 'activated', message: 'User activated successfully.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Check for associated records
    let hasRecords = false
    const [jobsRes, techJobsRes, paymentsRes, attendanceRes] = await Promise.all([
      supabaseAdmin.from('jobs').select('id', { count: 'exact', head: true }).or(`technician_id.eq.${userId},receptionist_id.eq.${userId}`),
      supabaseAdmin.from('job_technicians').select('id', { count: 'exact', head: true }).eq('technician_id', userId),
      supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }).or(`user_id.eq.${userId},recorded_by.eq.${userId}`),
      supabaseAdmin.from('attendance').select('id', { count: 'exact', head: true }).or(`user_id.eq.${userId},approved_by.eq.${userId}`),
    ])

    if ((jobsRes.count || 0) > 0 || (techJobsRes.count || 0) > 0 || (paymentsRes.count || 0) > 0 || (attendanceRes.count || 0) > 0) {
      hasRecords = true
    }

    // Option A: If records exist or action is 'deactivate', perform safe deactivation
    if (hasRecords || action === 'deactivate') {
      const { error: deactErr } = await supabaseAdmin
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (deactErr) throw deactErr

      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
        await supabaseAdmin.auth.admin.signOut(userId)
      } catch (authErr) {
        console.error('Failed to ban auth user in fallback:', authErr)
      }

      return new Response(JSON.stringify({ 
        success: true, 
        action: 'deactivated', 
        has_records: hasRecords,
        message: 'Staff member has associated records. Account deactivated and login access revoked while preserving audit history.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Zero records: True hard delete
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (dbError) {
      // If a foreign key constraint was hit unexpectedly, fall back to deactivation
      if (dbError.code === '23503' || dbError.message?.includes('foreign key constraint')) {
        await supabaseAdmin.from('users').update({ is_active: false }).eq('id', userId)
        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
          await supabaseAdmin.auth.admin.signOut(userId)
        } catch (e) {}

        return new Response(JSON.stringify({
          success: true,
          action: 'deactivated',
          has_records: true,
          message: 'Staff member has associated records. Deactivated account and revoked login access to preserve audit history.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      throw new Error('Failed to delete user record: ' + dbError.message)
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('Failed to delete auth user, but DB user was deleted:', authError)
    }

    return new Response(JSON.stringify({ success: true, action: 'deleted', has_records: false, message: 'Staff member permanently deleted.' }), {
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
