const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to fix duplicate imports and malformed files
function fixResponsiveFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Processing: ${filePath}`);
    
    // Check if file has malformed imports (imports inside React component imports)
    const hasMalformedImports = content.includes('// Responsive Design Hooks\n  const { theme } = useTheme();') ||
                                content.includes('const { theme } = useTheme();\n  const { styles: responsiveStyles } = useResponsiveScreen();\n\n  View,');

    if (hasMalformedImports) {
      console.log(`  ⚠️  Malformed imports detected - needs manual fix`);
      return false;
    }
    
    // Remove duplicate responsive imports
    const responsiveImportBlock = `// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';`;

    // Count occurrences of the responsive import block
    const occurrences = (content.match(/\/\/ Responsive Design Imports/g) || []).length;
    
    if (occurrences > 1) {
      console.log(`  🔧 Fixing ${occurrences} duplicate import blocks`);
      
      // Remove all responsive import blocks first
      content = content.replace(/\/\/ Responsive Design Imports[\s\S]*?import { getAccessibilityProps } from '\.\.\/\.\.\/Utils\/AccessibilityUtils';/g, '');
      
      // Find the last regular import statement
      const importRegex = /^import.*from.*['"];$/gm;
      let lastImportIndex = -1;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        if (!match[0].includes('// Responsive Design')) {
          lastImportIndex = match.index + match[0].length;
        }
      }
      
      if (lastImportIndex !== -1) {
        // Insert the responsive imports after the last regular import
        content = content.slice(0, lastImportIndex) + '\n\n' + responsiveImportBlock + content.slice(lastImportIndex);
        console.log(`  ✅ Fixed duplicate imports`);
      }
    }
    
    // Ensure responsive components import exists if used
    if ((content.includes('ResponsiveText') || content.includes('ResponsiveButton') || content.includes('ResponsiveInput')) &&
        !content.includes('ResponsiveText, ResponsiveButton, ResponsiveInput')) {
      
      const responsiveComponentImport = `import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';`;
      
      if (!content.includes(responsiveComponentImport)) {
        // Add it after the accessibility import
        content = content.replace(
          /import { getAccessibilityProps } from '\.\.\/\.\.\/Utils\/AccessibilityUtils';/,
          `import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';\n${responsiveComponentImport}`
        );
        console.log(`  ✅ Added responsive components import`);
      }
    }
    
    // Clean up extra newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ File processed successfully`);
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Function to identify severely malformed files that need manual fixing
function identifyMalformedFiles() {
  console.log('🔍 Identifying malformed files...\n');
  
  const responsiveFiles = [
    '/Users/karthik/Documents/flykup(25.08)/src/Components/AuthScreens/Responsive*.tsx',
    '/Users/karthik/Documents/flykup(25.08)/src/Components/Responsive*.tsx',
    '/Users/karthik/Documents/flykup(25.08)/src/Components/**/Responsive*.tsx'
  ];
  
  const malformedFiles = [];
  
  responsiveFiles.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for malformed import structure
        if (content.includes('const { theme } = useTheme();\n  const { styles: responsiveStyles } = useResponsiveScreen();\n\n  View,') ||
            content.includes('// Responsive Design Hooks\n  const { theme } = useTheme();') ||
            content.includes('import {\n  // Responsive Design Hooks')) {
          malformedFiles.push(file);
        }
      } catch (error) {
        console.log(`Error reading ${file}: ${error.message}`);
      }
    });
  });
  
  return malformedFiles;
}

// Main execution
console.log('🚀 Starting responsive import fixes...\n');

// First identify severely malformed files
const malformedFiles = identifyMalformedFiles();

if (malformedFiles.length > 0) {
  console.log('⚠️  Found severely malformed files that need manual fixing:');
  malformedFiles.forEach(file => console.log(`   ${file}`));
  console.log('\nThese files have import statements mixed with React imports and need manual correction.\n');
}

// Process all responsive files
const patterns = [
  '/Users/karthik/Documents/flykup(25.08)/src/Components/AuthScreens/Responsive*.tsx',
  '/Users/karthik/Documents/flykup(25.08)/src/Components/Responsive*.tsx',
  '/Users/karthik/Documents/flykup(25.08)/src/Components/**/Responsive*.tsx'
];

let processedCount = 0;
let fixedCount = 0;

patterns.forEach(pattern => {
  const files = glob.sync(pattern);
  files.forEach(file => {
    if (!malformedFiles.includes(file)) {
      processedCount++;
      if (fixResponsiveFile(file)) {
        fixedCount++;
      }
    }
  });
});

console.log('\n📊 Summary:');
console.log(`✅ Processed ${processedCount} files`);
console.log(`🔧 Fixed ${fixedCount} files`);
console.log(`⚠️  ${malformedFiles.length} files need manual fixing`);

if (malformedFiles.length > 0) {
  console.log('\n🛠️  Manual fixes needed for:');
  malformedFiles.forEach(file => {
    console.log(`   ${path.basename(file)}`);
  });
  console.log('\nThese files have React Native imports mixed with hook calls and need to be rewritten properly.');
}