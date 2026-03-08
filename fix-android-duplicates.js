const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Android Duplicate Resource Issues...\n');

// Get the project root directory
const projectRoot = __dirname;
console.log(`📂 Project root: ${projectRoot}\n`);

// Path to the problematic file
const responsiveColorsPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'colors_responsive.xml');

console.log(`🔍 Checking for duplicate file: ${responsiveColorsPath}\n`);

if (fs.existsSync(responsiveColorsPath)) {
  console.log('📁 Found colors_responsive.xml - removing duplicate...');
  try {
    fs.unlinkSync(responsiveColorsPath);
    console.log('✅ Successfully removed colors_responsive.xml\n');
  } catch (error) {
    console.error('❌ Error removing file:', error.message);
    console.log('⚠️ Please manually delete: android/app/src/main/res/values/colors_responsive.xml\n');
  }
} else {
  console.log('ℹ️ colors_responsive.xml not found (already removed or doesn\'t exist)\n');
}

// Check for other potential conflicts
const valuesDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values');
if (fs.existsSync(valuesDir)) {
  const colorFiles = fs.readdirSync(valuesDir).filter(file => 
    file.includes('color') && file.endsWith('.xml')
  );
  
  console.log('📋 Color resource files found:');
  colorFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  if (colorFiles.length > 1) {
    console.log('⚠️ Multiple color files detected. Make sure they don\'t have duplicate resource names.\n');
  }
}

// Clean build directories
const buildDirs = [
  path.join(projectRoot, 'android', 'build'),
  path.join(projectRoot, 'android', 'app', 'build')
];

buildDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`🧹 Build directory exists: ${dir}`);
    console.log('   Run: cd android && gradlew clean (or gradlew.bat clean on Windows)');
  }
});

console.log('\n🎉 Duplicate resource fix completed!');
console.log('\n📋 Next steps to run on your Windows machine:');
console.log('1. npm install');
console.log('2. npx react-native start --reset-cache');
console.log('3. cd android && gradlew clean');
console.log('4. npx react-native run-android');
console.log('\nIf you still get errors, make sure there are no other files with duplicate color names.');