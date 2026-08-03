# Root Cause Analysis

## Error 1: Incompatible React Versions (19.2.7 vs 19.1.0)
React 19 imposes a strict requirement that the `react` and `react-dom` versions (and renderer versions) match exactly to ensure the reconciler stays perfectly in sync. In `RepairShopApp/package.json`, both were specified as `^19.1.0`. However, a nested dependency resolution (or conflicting root dependency) caused npm to pull down `react@19.2.7` while leaving `react-dom` at `19.1.0`. When React Native attempted to mount, it detected the discrepancy in the reconciler engine versions and threw the fatal error.

## Error 2: Metro Cannot Resolve React
Metro's default configuration assumes a single-project layout where all dependencies live directly inside the project's own `node_modules` directory. In this NPM Workspace setup, shared dependencies like `react` were hoisted to `C:\Users\bakht\Desktop\Project\node_modules`. 

When Metro compiled `packages/shared/src/Badge.tsx`, it searched for `react` locally within `RepairShopApp/node_modules`. Because the monorepo config (`nodeModulesPaths`) was missing, Metro had no awareness of the root `node_modules` folder, causing the resolution to fail entirely.

## Summary of Root Causes
1. **Dependency Drift:** Unpinned React dependencies allowed `react` and `react-dom` to decouple their exact versions.
2. **Missing Workspace Resolution:** Metro was blind to the root hoisted `node_modules` tree.
3. **Legacy Dependencies:** `@repairshop/shared` forcing an older React version (`18.3.1`) which split the dependency tree into multiple instances.
