const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Android Style Resource Issues...\n');

// Get the project root directory
const projectRoot = __dirname;
console.log(`📂 Project root: ${projectRoot}\n`);

// Path to the responsive styles file
const responsiveStylesPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'responsive_styles.xml');

console.log(`🔍 Checking responsive styles file: ${responsiveStylesPath}\n`);

if (fs.existsSync(responsiveStylesPath)) {
  try {
    let content = fs.readFileSync(responsiveStylesPath, 'utf8');
    
    // Check if the base styles are missing
    if (!content.includes('style name="Widget.Flykup" parent="android:Widget"') || 
        !content.includes('style name="ShapeAppearanceOverlay.Flykup"')) {
      
      console.log('🔧 Adding missing base style definitions...');
      
      // Add the missing base styles
      const baseStylesDefinition = `    <!-- Base style definitions that other styles inherit from -->
    <style name="Widget.Flykup" parent="android:Widget" />
    <style name="ShapeAppearanceOverlay.Flykup" parent="">
        <item name="cornerSize">8dp</item>
    </style>
    
    `;
      
      // Insert after the "Base Responsive Styles" comment
      content = content.replace(
        /<!-- Base Responsive Styles -->\s*\n\s*/,
        `<!-- Base Responsive Styles -->
    
${baseStylesDefinition}`
      );
      
      fs.writeFileSync(responsiveStylesPath, content);
      console.log('✅ Added missing base styles\n');
    } else {
      console.log('ℹ️ Base styles already exist\n');
    }
  } catch (error) {
    console.error('❌ Error reading/writing responsive_styles.xml:', error.message);
  }
} else {
  console.log('⚠️ responsive_styles.xml not found - creating minimal version...\n');
  
  const minimalStyles = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Base Responsive Styles -->
    
    <!-- Base style definitions -->
    <style name="Widget.Flykup" parent="android:Widget" />
    <style name="ShapeAppearanceOverlay.Flykup" parent="">
        <item name="cornerSize">8dp</item>
    </style>
    
    <!-- Basic button style -->
    <style name="Widget.Flykup.Button" parent="Widget.MaterialComponents.Button" />
</resources>`;

  try {
    fs.writeFileSync(responsiveStylesPath, minimalStyles);
    console.log('✅ Created minimal responsive_styles.xml\n');
  } catch (error) {
    console.error('❌ Error creating responsive_styles.xml:', error.message);
  }
}

// Check if main styles.xml exists and has required styles
const mainStylesPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');

if (fs.existsSync(mainStylesPath)) {
  console.log('✅ Main styles.xml exists');
  
  try {
    const mainStylesContent = fs.readFileSync(mainStylesPath, 'utf8');
    
    if (mainStylesContent.includes('AppTheme')) {
      console.log('✅ AppTheme found in styles.xml');
    } else {
      console.log('⚠️ AppTheme not found in styles.xml');
    }
  } catch (error) {
    console.error('❌ Error reading styles.xml:', error.message);
  }
} else {
  console.log('⚠️ Main styles.xml not found');
}

console.log('\n🎉 Android style fixes completed!');
console.log('\n📋 Next steps to run on your Windows machine (D:\\FLYKUP\\):');
console.log('1. Run this script: node fix-android-styles-windows.js');
console.log('2. Clean build: cd android && gradlew clean && cd ..');
console.log('3. Fresh install: npm install');
console.log('4. Reset cache: npx react-native start --reset-cache');
console.log('5. Build: npx react-native run-android');
console.log('\nThis should resolve the style resource linking errors!');