const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase v12 support: Ensure .cjs files are resolved
config.resolver.sourceExts.push('cjs');

module.exports = withNativeWind(config, { input: './global.css' });

