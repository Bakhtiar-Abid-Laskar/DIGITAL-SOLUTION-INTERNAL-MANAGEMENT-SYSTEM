const fs = require('fs');
const path = require('path');

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'field-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const files = [
  "admin-panel/src/app/(admin)/inventory/page.tsx",
  "admin-panel/src/app/(admin)/jobs/[id]/page.tsx",
  "admin-panel/src/app/(admin)/jobs/page.tsx",
  "admin-panel/src/app/(admin)/materials/page.tsx",
  "admin-panel/src/app/(admin)/page.tsx",
  "admin-panel/src/app/(admin)/reports/page.tsx",
  "admin-panel/src/app/(admin)/sales/new/page.tsx",
  "admin-panel/src/app/(admin)/sales/page.tsx",
  "admin-panel/src/app/(admin)/staff/page.tsx",
  "admin-panel/src/app/login/page.tsx",
  "admin-panel/src/components/common/ConfirmationModal.tsx",
  "admin-panel/src/components/common/Toast.tsx",
  "admin-panel/src/components/inventory/AddStockModal.tsx",
  "admin-panel/src/components/inventory/InventoryFormModal.tsx",
  "admin-panel/src/components/layout/NotificationsDropdown.tsx",
  "admin-panel/src/components/salary/AdvanceSalaryForm.tsx",
  "admin-panel/src/components/salary/BonusForm.tsx",
  "admin-panel/src/components/salary/HolidayCalendarForm.tsx",
  "admin-panel/src/components/salary/LeaveManagement.tsx",
  "admin-panel/src/components/salary/SalaryCalculatorForm.tsx",
  "admin-panel/src/components/salary/StaffRateForm.tsx",
  "admin-panel/src/components/staff/AddStaffModal.tsx",
  "admin-panel/src/components/staff/StaffList.tsx"
];

files.forEach(filepath => {
  if (!fs.existsSync(filepath)) return;
  
  let content = fs.readFileSync(filepath, 'utf8');
  let pieces = content.split('<label');
  let new_content = pieces[0];
  
  for (let i = 1; i < pieces.length; i++) {
    let piece = pieces[i];
    if (piece.startsWith(' htmlFor') || piece.startsWith(' id')) {
      new_content += '<label' + piece;
      continue;
    }
    
    let end_idx = piece.indexOf('>');
    if (end_idx === -1) {
      new_content += '<label' + piece;
      continue;
    }
    
    let field_id = generateId();
    let new_piece = ' htmlFor="' + field_id + '"' + piece.substring(0, end_idx) + piece.substring(end_idx);
    
    let tag_match = new_piece.match(/<(input|select|textarea|Input|Select)(?=\s|>)/);
    if (tag_match) {
      let insert_pos = tag_match.index + tag_match[0].length;
      new_piece = new_piece.substring(0, insert_pos) + ' id="' + field_id + '"' + new_piece.substring(insert_pos);
    }
    
    new_content += '<label' + new_piece;
  }
  
  new_content = new_content.replace(/<(input|select|textarea|Input|Select)(?=\s|>)[^>]*>/g, (match, tag) => {
    if (match.includes('aria-label') || match.includes(' id=')) {
      return match;
    }
    let phMatch = match.match(/placeholder="([^"]+)"/);
    if (phMatch) {
      return match.replace(tag, `${tag} aria-label="${phMatch[1]}"`);
    }
    return match.replace(tag, `${tag} aria-label="Field"`);
  });
  
  if (new_content !== content) {
    fs.writeFileSync(filepath, new_content, 'utf8');
    console.log(`Fixed ${filepath}`);
  }
});
