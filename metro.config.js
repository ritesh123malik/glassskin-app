const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add GLB support to asset extensions
if (!config.resolver.assetExts.includes("glb")) {
  config.resolver.assetExts.push("glb");
}
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

module.exports = withNativeWind(config, { input: "./global.css" });
