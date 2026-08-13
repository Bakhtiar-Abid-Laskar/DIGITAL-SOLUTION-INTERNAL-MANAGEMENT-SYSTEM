// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve @repairshop/shared to the inlined local copy.
// EAS cloud builds only upload the RepairShopApp/ directory, so they cannot
// access ../packages/shared. The inlined copy at src/lib/shared is self-contained.
config.resolver.extraNodeModules = {
  '@repairshop/shared': path.resolve(__dirname, 'src/lib/shared'),
};

module.exports = config;

