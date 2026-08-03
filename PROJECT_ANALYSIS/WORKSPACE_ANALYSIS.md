# Workspace Analysis

## Workspace Setup
- **Type**: NPM Workspaces
- **Root**: `c:\Users\bakht\Desktop\Project`
- **Workspaces defined in root `package.json`**:
  - `admin-panel`
  - `packages/shared`
  - `RepairShopApp`

## Linking Mechanism
NPM workspaces use standard symlinks inside the root `node_modules`. 
- `node_modules/@repairshop/shared` -> `packages/shared`
- `node_modules/admin-panel` -> `admin-panel`
- `node_modules/repairshopapp` -> `RepairShopApp`

## Dependencies Hoisting
NPM attempts to hoist dependencies (like `react`, `react-dom`, `@supabase/supabase-js`) to the root `node_modules`. 
However, when child workspaces specify conflicting versions (e.g. `packages/shared` specifying `react@^18.3.1` while `RepairShopApp` specified `react@^19.1.0`), npm is forced to nest the legacy version inside `packages/shared/node_modules/react`.

This breaks React context and React Native's singleton requirements, causing the "Incompatible React versions" or Metro resolution crashes.
