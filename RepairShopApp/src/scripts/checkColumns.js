const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('../admin-panel/.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key] = val.join('=').trim().replace(/"/g, '');
  return acc;
}, {});
const supabaseUrl = env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.REACT_APP_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('No credentials'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  let { data, error } = await supabase.from('invoice_items').select('*').limit(1);
  if (error) {
     console.log('Error invoice_items:', error.message);
  } else {
     console.log('invoice_items columns:', data.length ? Object.keys(data[0]) : 'Empty table, but exists');
  }
  let res = await supabase.from('sale_items').select('*').limit(1);
  if (res.error) {
     console.log('Error sale_items:', res.error.message);
  } else {
     console.log('sale_items columns:', res.data.length ? Object.keys(res.data[0]) : 'Empty table, but exists');
  }
}
run();
