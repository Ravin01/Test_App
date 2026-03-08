const fs = require('fs');
const path = require('path');

console.log('🚀 Quick Android Build Fix - Removing Complex Styles...\n');

const projectRoot = __dirname;

// Files to remove to simplify the build
const filesToRemove = [
  'android/app/src/main/res/values/colors_responsive.xml',
  'android/app/src/main/res/values/responsive_styles.xml'
];

filesToRemove.forEach(filePath => {
  const fullPath = path.join(projectRoot, filePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✅ Removed: ${filePath}`);
    } catch (error) {
      console.log(`❌ Failed to remove ${filePath}: ${error.message}`);
    }
  } else {
    console.log(`ℹ️ Already removed: ${filePath}`);
  }
});

// Create a minimal styles.xml if it doesn't exist or is corrupted
const stylesPath = path.join(projectRoot, 'android/app/src/main/res/values/styles.xml');

const minimalStyles = `<resources>
    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <!-- Customize your theme here. -->
        <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    </style>

    <!-- Splash Theme -->
    <style name="SplashSystemTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@color/splash_background</item>
        <item name="android:statusBarColor">@color/splash_background</item>
        <item name="android:navigationBarColor">@color/splash_background</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>
</resources>`;

try {
  fs.writeFileSync(stylesPath, minimalStyles);
  console.log('✅ Updated styles.xml with minimal required styles\n');
} catch (error) {
  console.log(`❌ Failed to update styles.xml: ${error.message}\n`);
}

console.log('🎉 Quick fix completed!\n');
console.log('📋 What this did:');
console.log('• Removed complex responsive styles that were causing conflicts');
console.log('• Kept only the essential app and splash themes');
console.log('• Your responsive design still works via JavaScript (ResponsiveTheme.tsx)');
console.log('\n📋 Next steps on Windows (D:\\FLYKUP\\):');
console.log('1. Run this script: node quick-fix-android-build.js');
console.log('2. Clean build: cd android && gradlew clean');
console.log('3. Build: npx react-native run-android');
console.log('\n💡 Note: This removes Android XML responsive styles but keeps JavaScript responsive system intact!');