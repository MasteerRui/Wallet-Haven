const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: ['ttf', 'otf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
