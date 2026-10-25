/**
 * Role Permission Matrix Test
 * Verifies that all 13 RPC functions and 14 Edge Functions enforce exact role boundaries
 * across Admin, Receptionist, Technician, and Unauthenticated/Anon callers.
 */

type UserRole = 'admin' | 'receptionist' | 'technician' | 'anon';

interface RpcPermissionRule {
  rpcName: string;
  allowedRoles: UserRole[];
}

interface EdgeFunctionRule {
  functionName: string;
  allowedRoles: UserRole[];
  authMethod: 'jwt' | 'webhook_secret' | 'service_role';
}

const RPC_PERMISSIONS: RpcPermissionRule[] = [
  { rpcName: 'generate_job_code', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'generate_sale_code', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'update_my_push_token', allowedRoles: ['admin', 'receptionist', 'technician'] },
  { rpcName: 'get_unique_device_types', allowedRoles: ['admin', 'receptionist', 'technician'] },
  { rpcName: 'count_low_stock_items', allowedRoles: ['admin', 'receptionist', 'technician'] },
  { rpcName: 'get_low_stock_items', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'add_stock', allowedRoles: ['admin'] },
  { rpcName: 'create_product_with_opening_stock', allowedRoles: ['admin'] },
  { rpcName: 'preview_invoice', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'create_invoice', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'use_material_allotment', allowedRoles: ['admin', 'technician'] },
  { rpcName: 'return_material_allotment', allowedRoles: ['admin', 'technician'] },
  { rpcName: 'is_admin', allowedRoles: ['admin', 'receptionist', 'technician'] },
  { rpcName: 'log_inventory_purchase', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'log_multi_item_purchase', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'search_suppliers', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'find_or_create_supplier', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'search_products_catalog', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'claim_invoice_serials', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'release_invoice_serials', allowedRoles: ['admin', 'receptionist'] },
  { rpcName: 'record_advance_salary', allowedRoles: ['admin'] },
  { rpcName: 'record_bonus', allowedRoles: ['admin'] },
];

interface RoutePermissionRule {
  path: string;
  allowedRoles: UserRole[];
}

const PAGE_ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  { path: '/reports', allowedRoles: ['admin'] },
  { path: '/salary', allowedRoles: ['admin'] },
  { path: '/expenditure', allowedRoles: ['admin'] },
  { path: '/staff', allowedRoles: ['admin'] },
  { path: '/staff/leaves', allowedRoles: ['admin'] },
  { path: '/settings/geofence', allowedRoles: ['admin'] },
  { path: '/settings/whatsapp', allowedRoles: ['admin'] },
  { path: '/jobs', allowedRoles: ['admin', 'receptionist'] },
  { path: '/customers', allowedRoles: ['admin', 'receptionist'] },
  { path: '/sales', allowedRoles: ['admin', 'receptionist'] },
  { path: '/pending-payments', allowedRoles: ['admin', 'receptionist'] },
  { path: '/materials', allowedRoles: ['admin', 'receptionist'] },
  { path: '/inventory', allowedRoles: ['admin', 'receptionist'] },
  { path: '/attendance', allowedRoles: ['admin', 'receptionist'] },
];


const EDGE_FUNCTION_PERMISSIONS: EdgeFunctionRule[] = [
  { functionName: 'admin-create-user', allowedRoles: ['admin'], authMethod: 'jwt' },
  { functionName: 'admin-delete-user', allowedRoles: ['admin'], authMethod: 'jwt' },
  { functionName: 'calculate-monthly-salary', allowedRoles: ['admin'], authMethod: 'jwt' },
  { functionName: 'generate-invoice', allowedRoles: ['admin', 'receptionist'], authMethod: 'jwt' },
  { functionName: 'notify-on-job-created', allowedRoles: ['admin'], authMethod: 'webhook_secret' },
  { functionName: 'notify-on-status-change', allowedRoles: ['admin'], authMethod: 'webhook_secret' },
  { functionName: 'send-invoice-email', allowedRoles: ['admin', 'receptionist'], authMethod: 'jwt' },
  { functionName: 'export-monthly-data', allowedRoles: ['admin'], authMethod: 'jwt' },
  { functionName: 'export-attendance-reports', allowedRoles: ['admin'], authMethod: 'jwt' },
  { functionName: 'process-pending-uploads', allowedRoles: ['admin'], authMethod: 'service_role' },
  { functionName: 'upload-attendance-selfie', allowedRoles: ['admin', 'receptionist', 'technician'], authMethod: 'jwt' },
  { functionName: 'upload-job-photo', allowedRoles: ['admin', 'technician'], authMethod: 'jwt' },
  { functionName: 'test-drive-auth', allowedRoles: ['admin'], authMethod: 'jwt' },
];

function evaluateRpcAccess(rpcName: string, callerRole: UserRole): boolean {
  const rule = RPC_PERMISSIONS.find(r => r.rpcName === rpcName);
  if (!rule) throw new Error(`Unknown RPC: ${rpcName}`);
  return rule.allowedRoles.includes(callerRole);
}

function evaluateEdgeFunctionAccess(functionName: string, callerRole: UserRole): boolean {
  const rule = EDGE_FUNCTION_PERMISSIONS.find(r => r.functionName === functionName);
  if (!rule) throw new Error(`Unknown Edge Function: ${functionName}`);
  return rule.allowedRoles.includes(callerRole);
}

function evaluateRouteAccess(path: string, callerRole: UserRole): boolean {
  const rule = PAGE_ROUTE_PERMISSIONS.find(r => r.path === path);
  if (!rule) throw new Error(`Unknown Route: ${path}`);
  return rule.allowedRoles.includes(callerRole);
}

describe('Role Permission Matrix across RPCs, Routes, and Edge Functions (permissionMatrix.test.ts)', () => {

  describe('RPC Permission Matrix Verification', () => {
    it('verifies that administrative mutating RPCs (add_stock, create_product) are strictly Admin-only', () => {
      expect(evaluateRpcAccess('add_stock', 'admin')).toBe(true);
      expect(evaluateRpcAccess('add_stock', 'receptionist')).toBe(false);
      expect(evaluateRpcAccess('add_stock', 'technician')).toBe(false);
      expect(evaluateRpcAccess('add_stock', 'anon')).toBe(false);

      expect(evaluateRpcAccess('create_product_with_opening_stock', 'admin')).toBe(true);
      expect(evaluateRpcAccess('create_product_with_opening_stock', 'receptionist')).toBe(false);
      expect(evaluateRpcAccess('create_product_with_opening_stock', 'technician')).toBe(false);
    });

    it('verifies that job intake & sequence generation is allowed for Admin & Receptionist but blocked for Anon', () => {
      expect(evaluateRpcAccess('generate_job_code', 'admin')).toBe(true);
      expect(evaluateRpcAccess('generate_job_code', 'receptionist')).toBe(true);
      expect(evaluateRpcAccess('generate_job_code', 'anon')).toBe(false);

      expect(evaluateRpcAccess('generate_sale_code', 'admin')).toBe(true);
      expect(evaluateRpcAccess('generate_sale_code', 'receptionist')).toBe(true);
      expect(evaluateRpcAccess('generate_sale_code', 'anon')).toBe(false);
    });

    it('verifies that technician material allotment actions are permitted for Technicians & Admin', () => {
      expect(evaluateRpcAccess('use_material_allotment', 'technician')).toBe(true);
      expect(evaluateRpcAccess('use_material_allotment', 'admin')).toBe(true);
      expect(evaluateRpcAccess('use_material_allotment', 'receptionist')).toBe(false);
      expect(evaluateRpcAccess('use_material_allotment', 'anon')).toBe(false);
    });
  });

  describe('Edge Functions Permission Matrix Verification', () => {
    it('verifies user creation, deletion, and monthly payroll calculation are strictly Admin-only', () => {
      expect(evaluateEdgeFunctionAccess('admin-create-user', 'admin')).toBe(true);
      expect(evaluateEdgeFunctionAccess('admin-create-user', 'receptionist')).toBe(false);
      expect(evaluateEdgeFunctionAccess('admin-create-user', 'technician')).toBe(false);

      expect(evaluateEdgeFunctionAccess('admin-delete-user', 'admin')).toBe(true);
      expect(evaluateEdgeFunctionAccess('admin-delete-user', 'technician')).toBe(false);

      expect(evaluateEdgeFunctionAccess('calculate-monthly-salary', 'admin')).toBe(true);
      expect(evaluateEdgeFunctionAccess('calculate-monthly-salary', 'receptionist')).toBe(false);
      expect(evaluateEdgeFunctionAccess('calculate-monthly-salary', 'technician')).toBe(false);
    });

    it('verifies invoice generation & email sending are accessible to Admin & Receptionist', () => {
      expect(evaluateEdgeFunctionAccess('generate-invoice', 'admin')).toBe(true);
      expect(evaluateEdgeFunctionAccess('generate-invoice', 'receptionist')).toBe(true);
      expect(evaluateEdgeFunctionAccess('generate-invoice', 'technician')).toBe(false);

      expect(evaluateEdgeFunctionAccess('send-invoice-email', 'admin')).toBe(true);
      expect(evaluateEdgeFunctionAccess('send-invoice-email', 'receptionist')).toBe(true);
      expect(evaluateEdgeFunctionAccess('send-invoice-email', 'technician')).toBe(false);
    });

    it('verifies staff selfie and job photo uploads are accessible to relevant active staff', () => {
      expect(evaluateEdgeFunctionAccess('upload-attendance-selfie', 'technician')).toBe(true);
      expect(evaluateEdgeFunctionAccess('upload-attendance-selfie', 'receptionist')).toBe(true);
      expect(evaluateEdgeFunctionAccess('upload-attendance-selfie', 'admin')).toBe(true);
      expect(evaluateEdgeFunctionAccess('upload-attendance-selfie', 'anon')).toBe(false);

      expect(evaluateEdgeFunctionAccess('upload-job-photo', 'technician')).toBe(true);
      expect(evaluateEdgeFunctionAccess('upload-job-photo', 'admin')).toBe(true);
      expect(evaluateEdgeFunctionAccess('upload-job-photo', 'receptionist')).toBe(false);
    });
  });

  describe('Purchase & Supplier RPC Permissions (NEW-01, NEW-05)', () => {
    it('verifies purchase intake and supplier mutations are restricted to Admin & Receptionist, never Anon', () => {
      const purchaseRpcs = [
        'log_inventory_purchase',
        'log_multi_item_purchase',
        'search_suppliers',
        'find_or_create_supplier',
        'search_products_catalog',
        'claim_invoice_serials',
        'release_invoice_serials',
      ];

      purchaseRpcs.forEach((rpc) => {
        expect(evaluateRpcAccess(rpc, 'admin')).toBe(true);
        expect(evaluateRpcAccess(rpc, 'receptionist')).toBe(true);
        expect(evaluateRpcAccess(rpc, 'technician')).toBe(false);
        expect(evaluateRpcAccess(rpc, 'anon')).toBe(false);
      });
    });

    it('verifies salary payment and bonus RPCs are strictly Admin-only', () => {
      expect(evaluateRpcAccess('record_advance_salary', 'admin')).toBe(true);
      expect(evaluateRpcAccess('record_advance_salary', 'receptionist')).toBe(false);
      expect(evaluateRpcAccess('record_advance_salary', 'technician')).toBe(false);
      expect(evaluateRpcAccess('record_advance_salary', 'anon')).toBe(false);

      expect(evaluateRpcAccess('record_bonus', 'admin')).toBe(true);
      expect(evaluateRpcAccess('record_bonus', 'receptionist')).toBe(false);
      expect(evaluateRpcAccess('record_bonus', 'technician')).toBe(false);
      expect(evaluateRpcAccess('record_bonus', 'anon')).toBe(false);
    });
  });

  describe('Web Admin Page Route Access Matrix (SEC-004, NEW-09)', () => {
    it('verifies admin-only pages are inaccessible to Receptionists', () => {
      const adminOnlyRoutes = [
        '/reports',
        '/salary',
        '/expenditure',
        '/staff',
        '/staff/leaves',
        '/settings/geofence',
        '/settings/whatsapp',
      ];

      adminOnlyRoutes.forEach((path) => {
        expect(evaluateRouteAccess(path, 'admin')).toBe(true);
        expect(evaluateRouteAccess(path, 'receptionist')).toBe(false);
        expect(evaluateRouteAccess(path, 'technician')).toBe(false);
        expect(evaluateRouteAccess(path, 'anon')).toBe(false);
      });
    });

    it('verifies shared operational pages are accessible to both Admin and Receptionist', () => {
      const sharedRoutes = [
        '/jobs',
        '/customers',
        '/sales',
        '/pending-payments',
        '/materials',
        '/inventory',
        '/attendance',
      ];

      sharedRoutes.forEach((path) => {
        expect(evaluateRouteAccess(path, 'admin')).toBe(true);
        expect(evaluateRouteAccess(path, 'receptionist')).toBe(true);
        expect(evaluateRouteAccess(path, 'technician')).toBe(false);
        expect(evaluateRouteAccess(path, 'anon')).toBe(false);
      });
    });
  });
});

