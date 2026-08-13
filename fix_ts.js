const fs = require('fs');
const path = require('path');

function replaceInFile(filepath, replacements) {
    if (!fs.existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        return;
    }
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    for (const r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated ${filepath}`);
    }
}

// admin-panel fixes
replaceInFile('admin-panel/src/components/expenditure/ExpenditureForm.tsx', [
    { search: /disabled=\{saving\}/g, replace: 'disabled={state.saving}' },
    { search: /\{saving \? 'Saving\.\.\.' : 'Add Expenditure'\}/g, replace: '{state.saving ? \'Saving...\' : \'Add Expenditure\'}' }
]);

replaceInFile('admin-panel/src/components/inventory/InventoryFormModal.tsx', [
    { search: /import \{ useState, useEffect \} from 'react';/, replace: 'import React, { useState, useEffect } from \'react\';' }
]);

replaceInFile('admin-panel/src/components/staff/AddStaffModal.tsx', [
    { search: /import \{ useState \} from 'react';/, replace: 'import React, { useState } from \'react\';' }
]);

// RepairShopApp fixes
replaceInFile('RepairShopApp/src/components/materials/AddMaterialModal.tsx', [
    { search: /\.map\(\(item\) => \(/g, replace: '.map((item: any) => (' }
]);

replaceInFile('RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx', [
    { search: /reduce\(\(sum, item\) =>/g, replace: 'reduce((sum: number, item: any) =>' },
    { search: /\.map\(\(item, i\) =>/g, replace: '.map((item: any, i: number) =>' },
    { search: /\.filter\(\(\_, i\) => i !== index\)/g, replace: '.filter((_: any, i: number) => i !== index)' },
    { search: /key=\{index\}/g, replace: 'key={index.toString()}' },
    { search: /renderItem=\{_renderItem\}/, replace: 'renderItem={_renderItem as any}' },
    { search: /\.map\(\(item, index\) =>/g, replace: '.map((item: any, index: number) =>' },
    { search: /renderItem=\{\(\{ item, index \}\) =>/g, replace: 'renderItem={({ item, index }: { item: any; index: number }) =>' },
    { search: /item=>/g, replace: '(item: any)=>' },
    { search: /item =>/g, replace: '(item: any) =>' },
    { search: /keyExtractor=\{item =>/g, replace: 'keyExtractor={(item: any) =>' }
]);

replaceInFile('RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx', [
    { search: /reduce\(\(sum, mat\) =>/g, replace: 'reduce((sum: number, mat: any) =>' },
    { search: /\.filter\(m =>/g, replace: '.filter((m: any) =>' },
    { search: /\.map\(m =>/g, replace: '.map((m: any) =>' },
    { search: /\.find\(m =>/g, replace: '.find((m: any) =>' }
]);
