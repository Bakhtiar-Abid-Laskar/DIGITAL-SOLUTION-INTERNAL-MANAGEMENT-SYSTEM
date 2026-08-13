import os
import re
import random
import string

def generate_id():
    return 'field-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

files = [
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
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pieces = content.split('<label')
    new_content = pieces[0]
    
    for piece in pieces[1:]:
        if piece.startswith(' htmlFor') or piece.startswith(' id'):
            new_content += '<label' + piece
            continue
            
        end_idx = piece.find('>')
        if end_idx == -1:
            new_content += '<label' + piece
            continue
            
        field_id = generate_id()
        new_piece = f' htmlFor="{field_id}"' + piece[:end_idx] + piece[end_idx:]
        
        tag_match = re.search(r'<(input|select|textarea|Input|Select)(?=\s|>)', new_piece)
        if tag_match:
            tag_name = tag_match.group(1)
            insert_pos = tag_match.end()
            new_piece = new_piece[:insert_pos] + f' id="{field_id}"' + new_piece[insert_pos:]
            
        new_content += '<label' + new_piece
        
    def inject_aria_label(match):
        tag_content = match.group(0)
        if 'aria-label' in tag_content or ' id=' in tag_content:
            return tag_content
        ph_match = re.search(r'placeholder="([^"]+)"', tag_content)
        if ph_match:
            ph = ph_match.group(1)
            return tag_content.replace(match.group(1), f'{match.group(1)} aria-label="{ph}"', 1)
        
        return tag_content.replace(match.group(1), f'{match.group(1)} aria-label="Field"', 1)

    new_content = re.sub(r'<(input|select|textarea|Input|Select)(?=\s|>)[^>]*>', inject_aria_label, new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")
