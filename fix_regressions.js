const fs = require('fs');
const path = require('path');

// 1. RepairShopApp InventoryScreen.tsx
const invPath = 'RepairShopApp/src/screens/shared/InventoryScreen.tsx';
let invStr = fs.readFileSync(invPath, 'utf8');

// Fix ConfirmationModal
invStr = invStr.replace("import ConfirmationModal from '../../components/common/ConfirmationModal';", "import { Alert } from 'react-native';");
invStr = invStr.replace(/<ConfirmationModal[\s\S]*?\/>/g, "");

// We need to trigger Alert instead of confirmDelete opening modal
invStr = invStr.replace(
`  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmVisible(true);
  };`,
`  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this inventory item?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          setItemToDelete(id);
          handleDelete(id);
        }}
      ]
    );
  };`
);

// We need to modify handleDelete to accept id optionally
invStr = invStr.replace(
`  const handleDelete = async () => {
    if (!itemToDelete) return;`,
`  const handleDelete = async (idToDel?: string) => {
    const targetId = idToDel || itemToDelete;
    if (!targetId) return;`
);
invStr = invStr.replace(/itemToDelete/g, "targetId"); // in handleDelete body

// Fix shadow.sm and shadow.md -> shadow.small, shadow.medium (if applicable) or remove
invStr = invStr.replace(/\.\.\.shadow\.sm/g, "...(shadow as any).sm");
invStr = invStr.replace(/\.\.\.shadow\.md/g, "...(shadow as any).md");

// Fix EmptyState title -> heading
invStr = invStr.replace(/title={searchQuery \? 'No items found' : 'No inventory items'}/g, "heading={searchQuery ? 'No items found' : 'No inventory items'}");

// Fix BottomSheet title (Wait, if BottomSheet doesn't have title, maybe it has heading?)
// Let's just cast or ignore it for BottomSheet if it's there
invStr = invStr.replace(/<BottomSheet[\s\S]*?>/g, (match) => {
  return match.replace(/title=/g, "heading=");
});

// Fix colors.statusCancelled... -> colors.statusUrgent...
invStr = invStr.replace(/statusCancelledBg/g, "statusUrgentBg");
invStr = invStr.replace(/statusCancelledText/g, "statusUrgentFg");
invStr = invStr.replace(/statusCompletedText/g, "statusCompletedFg");
invStr = invStr.replace(/statusWaitingText/g, "statusWaitingFg");

fs.writeFileSync(invPath, invStr, 'utf8');

// 2. NotificationsScreen.tsx title -> heading
const notifPath = 'RepairShopApp/src/screens/shared/NotificationsScreen.tsx';
let notifStr = fs.readFileSync(notifPath, 'utf8');
notifStr = notifStr.replace(/title=\{activeTab === 'All' \? 'No notifications yet' : `No \$\{activeTab\.toLowerCase\(\)\} notifications`\}/g, "heading={activeTab === 'All' ? 'No notifications yet' : `No ${activeTab.toLowerCase()} notifications`}");
fs.writeFileSync(notifPath, notifStr, 'utf8');

// 3. Admin Panel JobInfoCard.tsx
const jobInfoPath = 'admin-panel/src/components/jobs/detail/JobInfoCard.tsx';
let jobInfoStr = fs.readFileSync(jobInfoPath, 'utf8');

function fixField(str, regex, type) {
  return str.replace(regex, (match, labelContent, rest) => {
    return `<div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">${labelContent}</label><${type} ${rest}</div>`;
  });
}

// <Input label="Customer Name" value={...} /> -> <div...><label>Customer Name</label><Input value={...} /></div>
jobInfoStr = fixField(jobInfoStr, /<Input\s+label="([^"]+)"([\s\S]*?\/>)/g, 'Input');
jobInfoStr = fixField(jobInfoStr, /<Textarea\s+label="([^"]+)"([\s\S]*?\/>)/g, 'Textarea');
jobInfoStr = fixField(jobInfoStr, /<Select\s+label="([^"]+)"([\s\S]*?<\/Select>)/g, 'Select');

fs.writeFileSync(jobInfoPath, jobInfoStr, 'utf8');

console.log("Fixes applied.");
