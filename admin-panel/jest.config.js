const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  modulePathIgnorePatterns: [
    "<rootDir>/../RepairShopApp/src/lib/shared",
    "<rootDir>/RepairShopApp/src/lib/shared",
  ],
};