const fs = require('fs');
const path = require('path');

// Scan Admin Panel pages
const adminAppDir = 'admin-panel/src/app';
function getAdminPages(dir) {
  let pages = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      pages = pages.concat(getAdminPages(full));
    } else if (e.name === 'page.tsx' || e.name === 'layout.tsx' || e.name === 'route.ts') {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n').length;
      pages.push({
        file: full.replace(/\\\\/g, '/'),
        type: e.name,
        lines,
        hasSupabase: content.includes('supabase'),
        hasState: content.includes('useState') || content.includes('useReducer'),
        hasEffects: content.includes('useEffect'),
      });
    }
  }
  return pages;
}

const adminPages = getAdminPages(adminAppDir);
console.log('=== ADMIN PANEL PAGES & LAYOUTS (' + adminPages.length + ') ===');
adminPages.forEach(p => console.log(`${p.file} (${p.lines} lines)`));

// Scan Mobile App screens
const mobileScreensDir = 'RepairShopApp/src/screens';
function getMobileScreens(dir) {
  let screens = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      screens = screens.concat(getMobileScreens(full));
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n').length;
      screens.push({
        file: full.replace(/\\\\/g, '/'),
        name: e.name,
        lines,
        hasSupabase: content.includes('supabase'),
        hasState: content.includes('useState') || content.includes('useReducer'),
        hasEffects: content.includes('useEffect'),
      });
    }
  }
  return screens;
}

const mobileScreens = getMobileScreens(mobileScreensDir);
console.log('\n=== REPAIRSHOPAPP SCREENS (' + mobileScreens.length + ') ===');
mobileScreens.forEach(s => console.log(`${s.file} (${s.lines} lines)`));
