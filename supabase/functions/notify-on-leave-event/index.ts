// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendPushNotification } from '../_shared/notifications.ts'

declare const Deno: any;

serve(async (req: Request) => {
  try {
    const signature = req.headers.get('webhook-signature')
    const authHeader = req.headers.get('Authorization')
    const webhookSecret = Deno.env.get('APP_WEBHOOK_SECRET')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const isAuthorized =
      !webhookSecret ||
      (signature && signature === webhookSecret) ||
      (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) ||
      (authHeader && authHeader.startsWith('Bearer '));

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    console.log('Received payload:', payload)
    
    if (payload.table === 'employee_leave') {
      const record = payload.record

      // Branch A: New Leave Application (INSERT) -> Notify Admins/Receptionists
      if (payload.type === 'INSERT') {
        const { data: user } = await supabase.from('users').select('name').eq('id', record.user_id).single()
        const userName = user?.name || 'An employee'

        const { data: staffUsers } = await supabase
          .from('users')
          .select('id, expo_push_token, role')
          .in('role', ['admin', 'receptionist'])
          
        if (staffUsers && staffUsers.length > 0) {
          await Promise.all(staffUsers.map(async (staff: any) => {
            await sendPushNotification(supabase, {
              userId: staff.id,
              pushToken: staff.expo_push_token,
              title: 'New Leave Request',
              body: `${userName} requested leave for ${record.leave_date}.`,
              data: { screen: 'Salary' },
            })
          }))
        }
      }
      
      // Branch B: Leave Status Changed (UPDATE) -> Notify Employee
      if (payload.type === 'UPDATE') {
        const oldRecord = payload.old_record
        if (record.status !== oldRecord.status && (record.status === 'approved' || record.status === 'rejected')) {
          const { data: user } = await supabase.from('users').select('expo_push_token').eq('id', record.user_id).single()
          
          await sendPushNotification(supabase, {
            userId: record.user_id,
            pushToken: user?.expo_push_token,
            title: 'Leave Request Updated',
            body: `Your leave for ${record.leave_date} has been ${record.status}.`,
            data: { screen: 'Salary' },
          })
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Leave notifications processed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Payload ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
