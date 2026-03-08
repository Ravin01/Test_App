
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withNativeWind} = require("nativewind/metro");

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: { 
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // ✅ Enable inline requires
      },
    }),
    babelTransformerPath: require.resolve("react-native-svg-transformer")
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...sourceExts, "svg"]
  },
  maxWorkers: 2, 
};

const merged = mergeConfig(defaultConfig, config);

// Wrap withNativeWind to safely handle cases where Expo SDK is not available
let finalConfig;
try {
  finalConfig = withNativeWind(merged, {input: "./global.css"});
} catch (error) {
  console.warn('⚠️ NativeWind configuration issue - proceeding without it:', error.message);
  finalConfig = merged;
}

module.exports = finalConfig;

// const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
// const { withNativeWind } = require("nativewind/metro");

// const defaultConfig = getDefaultConfig(__dirname);

// const config = mergeConfig(defaultConfig, {
//   transformer: {
//     getTransformOptions: async () => ({
//       transform: {
//         experimentalImportSupport: false,
//         inlineRequires: false, // Changed to false for css-interop compatibility
//       },
//     }),
//   },
//   resolver: {
//     alias: {
//       // Ensure proper JSX runtime resolution
//       'react/jsx-runtime': require.resolve('react/jsx-runtime'),
//       'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
//     },
//   },
// });

// module.exports = withNativeWind(config, { 
//   input: "./global.css",
//   configPath: "./tailwind.config.js"
// });

// const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// /**
//  * Metro configuration
//  * https://reactnative.dev/docs/metro
//  *
//  * @type {import('metro-config').MetroConfig}
//  */
// const config = {};
// module.exports = mergeConfig(getDefaultConfig(__dirname), config);

