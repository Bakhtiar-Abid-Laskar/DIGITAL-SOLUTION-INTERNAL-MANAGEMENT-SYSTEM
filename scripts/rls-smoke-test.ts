/**
 * RepairShop RLS Smoke Test Script
 *
 * Tests Row Level Security policies by authenticating as different roles
 * and verifying allowed/denied access patterns.
 *
 * Usage:
 *   1. Create a .env.local file in the scripts/ directory with:
 *      SUPABASE_URL=https://your-project.supabase.co
 *      SUPABASE_ANON_KEY=your-anon-key
 *
 *   2. Run: npx tsx scripts/rls-smoke-test.ts
 *
 *   3. Enter test user credentials when prompted.
 *
 * IMPORTANT:
 *   - Do NOT hardcode passwords in this script.
 *   - This script uses the ANON key (not service_role) to test RLS.
 *   - Create test accounts first (see docs/rls-testing.md).
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Load env from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Missing scripts/.env.local file. Create it with:');
    console.error('   SUPABASE_URL=https://your-project.supabase.co');
    console.error('   SUPABASE_ANON_KEY=your-anon-key');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set in scripts/.env.local');
  process.exit(1);
}

// Prompt helper
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Test result tracking
let passed = 0;
let failed = 0;

function pass(test: string) {
  console.log(`  ✅ PASS: ${test}`);
  passed++;
}

function fail(test: string, detail?: string) {
  console.log(`  ❌ FAIL: ${test}${detail ? ' — ' + detail : ''}`);
  failed++;
}

async function testRole(email: string, password: string, expectedRole: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing as: ${email} (expected role: ${expectedRole})`);
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    fail(`Login as ${email}`, authError?.message || 'No session');
    return;
  }
  pass(`Login as ${email}`);

  // Fetch profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (!profile) {
    fail('Fetch own profile', 'No profile found');
    return;
  }
  pass('Fetch own profile');

  if (profile.role !== expectedRole) {
    fail(`Role check`, `Expected ${expectedRole}, got ${profile.role}`);
  } else {
    pass(`Role check: ${expectedRole}`);
  }

  // ---- TABLE ACCESS TESTS ----

  // Jobs
  const { data: jobs, error: jobsErr } = await supabase.from('jobs').select('id, technician_id');
  if (expectedRole === 'technician') {
    const ownJobs = (jobs || []).filter((j: any) => j.technician_id === authData.user.id);
    const otherJobs = (jobs || []).filter((j: any) => j.technician_id !== authData.user.id);
    if (otherJobs.length === 0) {
      pass('Jobs: sees only assigned jobs');
    } else {
      fail('Jobs: sees only assigned jobs', `Found ${otherJobs.length} other technician's jobs`);
    }
  } else {
    pass(`Jobs: can read (${(jobs || []).length} rows)`);
  }

  // Billing
  const { data: billing } = await supabase.from('billing').select('id');
  if (expectedRole === 'technician') {
    if ((billing || []).length === 0) {
      pass('Billing: blocked (0 rows)');
    } else {
      fail('Billing: blocked', `Got ${billing!.length} rows — should be 0`);
    }
  } else {
    pass(`Billing: can read (${(billing || []).length} rows)`);
  }

  // Salary (admin-only)
  const { data: salary } = await supabase.from('salary').select('id');
  if (expectedRole === 'admin') {
    pass(`Salary: can read (${(salary || []).length} rows)`);
  } else {
    if ((salary || []).length === 0) {
      pass('Salary: blocked (0 rows)');
    } else {
      fail('Salary: blocked', `Got ${salary!.length} rows — should be 0`);
    }
  }

  // Staff Rates (admin-only)
  const { data: rates } = await supabase.from('staff_rates').select('user_id');
  if (expectedRole === 'admin') {
    pass(`Staff Rates: can read (${(rates || []).length} rows)`);
  } else {
    if ((rates || []).length === 0) {
      pass('Staff Rates: blocked (0 rows)');
    } else {
      fail('Staff Rates: blocked', `Got ${rates!.length} rows — should be 0`);
    }
  }

  // Payments (admin-only)
  const { data: payments } = await supabase.from('payments').select('id');
  if (expectedRole === 'admin') {
    pass(`Payments: can read (${(payments || []).length} rows)`);
  } else {
    if ((payments || []).length === 0) {
      pass('Payments: blocked (0 rows)');
    } else {
      fail('Payments: blocked', `Got ${payments!.length} rows — should be 0`);
    }
  }

  // Attendance (own rows only for non-admin)
  const { data: attendance } = await supabase.from('attendance').select('id, user_id');
  if (expectedRole === 'admin') {
    pass(`Attendance: can read all (${(attendance || []).length} rows)`);
  } else {
    const otherAtt = (attendance || []).filter((a: any) => a.user_id !== authData.user.id);
    if (otherAtt.length === 0) {
      pass(`Attendance: sees only own (${(attendance || []).length} rows)`);
    } else {
      fail('Attendance: sees only own', `Found ${otherAtt.length} other users' rows`);
    }
  }

  // Inventory
  const { data: inventory } = await supabase.from('inventory').select('id');
  if (expectedRole === 'technician') {
    if ((inventory || []).length === 0) {
      pass('Inventory: blocked (0 rows)');
    } else {
      fail('Inventory: blocked', `Got ${inventory!.length} rows — should be 0`);
    }
  } else {
    pass(`Inventory: can read (${(inventory || []).length} rows)`);
  }

  // Notifications (own only for non-admin)
  const { data: notifs } = await supabase.from('notifications').select('id, recipient_user_id');
  if (expectedRole === 'admin') {
    pass(`Notifications: can read all (${(notifs || []).length} rows)`);
  } else {
    const otherNotifs = (notifs || []).filter(
      (n: any) => n.recipient_user_id !== authData.user.id
    );
    if (otherNotifs.length === 0) {
      pass(`Notifications: sees only own (${(notifs || []).length} rows)`);
    } else {
      fail('Notifications: sees only own', `Found ${otherNotifs.length} other users' notifications`);
    }
  }

  // Sign out
  await supabase.auth.signOut();
}

async function main() {
  console.log('RepairShop RLS Smoke Test');
  console.log('========================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('');
  console.log('Enter credentials for each test role.');
  console.log('Press Enter to skip a role.\n');

  // Admin
  const adminEmail = await prompt('Admin email (or Enter to skip): ');
  if (adminEmail) {
    const adminPass = await prompt('Admin password: ');
    await testRole(adminEmail, adminPass, 'admin');
  }

  // Receptionist
  const recEmail = await prompt('\nReceptionist email (or Enter to skip): ');
  if (recEmail) {
    const recPass = await prompt('Receptionist password: ');
    await testRole(recEmail, recPass, 'receptionist');
  }

  // Technician 1
  const tech1Email = await prompt('\nTechnician 1 email (or Enter to skip): ');
  if (tech1Email) {
    const tech1Pass = await prompt('Technician 1 password: ');
    await testRole(tech1Email, tech1Pass, 'technician');
  }

  // Technician 2
  const tech2Email = await prompt('\nTechnician 2 email (or Enter to skip): ');
  if (tech2Email) {
    const tech2Pass = await prompt('Technician 2 password: ');
    await testRole(tech2Email, tech2Pass, 'technician');
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review RLS policies and security triggers.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

main().catch(console.error);
