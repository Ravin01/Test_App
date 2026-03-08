module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    "@babel/plugin-transform-class-static-block",
	"react-native-paper/babel",
	"react-native-reanimated/plugin", 
	['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      blocklist: null,
      allowlist: null,
      safe: false,
      allowUndefined: true,
    }]
  ],
  env: {
    production: {
      plugins: ['transform-remove-console']
    }
  }
};
// module.exports = {
//   presets: ['module:@react-native/babel-preset','nativewind/babel'],
//   plugins: [    'react-native-reanimated/plugin','@babel/plugin-transform-class-static-block'],
// };

// 'nativewind/babel'
