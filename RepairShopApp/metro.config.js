// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Force project root to THIS directory, not the monorepo root.
// Without this, npm workspaces causes Metro to resolve entry as
// ./RepairShopApp/index.ts relative to the monorepo root.
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Resolve @repairshop/shared to the inlined local copy.
config.resolver.extraNodeModules = {
  '@repairshop/shared': path.resolve(projectRoot, 'src/lib/shared'),
};

config.watchFolders = [projectRoot];

config.server = {
  ...config.server,
  unstable_serverRoot: projectRoot,
};

module.exports = config;
