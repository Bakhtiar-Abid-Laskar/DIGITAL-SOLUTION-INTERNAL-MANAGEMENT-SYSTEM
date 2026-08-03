# Metro Resolution Analysis

## Metro Configuration
The Metro bundler (`RepairShopApp/metro.config.js`) attempts to resolve modules required by the mobile app.

## Import Trace
```
packages/shared/src/Badge.tsx
-> import React from 'react'
```

## Failure Point
When Metro parses `Badge.tsx`, it tries to resolve `react`. Because `packages/shared` sits outside the `RepairShopApp` directory, Metro must be explicitly told to allow module resolution from the root `node_modules` (hoisted dependencies).

Even with `watchFolders` configured to include `workspaceRoot`, if the Metro config's `resolver.nodeModulesPaths` doesn't explicitly list the `workspaceRoot/node_modules`, Metro falls back to looking only in `RepairShopApp/node_modules/react`. Because npm hoisted `react` to the root, Metro fails to find it.

## Fix
```javascript
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
```
This forces Metro to correctly traverse the workspace dependency tree when compiling shared modules.
