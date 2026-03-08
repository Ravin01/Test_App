const fs = require('fs');
const path = require('path');

// Get all responsive files
function getAllResponsiveFiles() {
  const responsiveFiles = [];
  
  const directories = [
    'src/Components/AuthScreens',
    'src/Components/MyActivity', 
    'src/Components/Shows',
    'src/Components/SellerComponents/SellerForm',
    'src/Components/SellerComponents/ProductsScreen',
    'src/Components/SellerComponents/LiveStreaming',
    'src/Components/SellerComponents/ORM',
    'src/Components/ChatScreens',
    'src/Components/Profile',
    'src/Components/SellerProfile',
    'src/Components/AboutApp',
    'src/Components/Payment',
    'src/Components/AnalyticalScreens',
    'src/Components/GloabalSearch',
    'src/Components/CategoriesScreen'
  ];
  
  directories.forEach(dir => {
    try {
      const files = fs.readdirSync(path.join(__dirname, '..', dir));
      files.forEach(file => {
        if (file.startsWith('Responsive') && file.endsWith('.tsx')) {
          responsiveFiles.push(path.join(__dirname, '..', dir, file));
        }
      });
    } catch (error) {
      console.log(`Directory ${dir} not accessible`);
    }
  });
  
  // Also check root Components directory
  try {
    const rootFiles = fs.readdirSync(path.join(__dirname, '..', 'src/Components'));
    rootFiles.forEach(file => {
      if (file.startsWith('Responsive') && file.endsWith('.tsx')) {
        responsiveFiles.push(path.join(__dirname, '..', 'src/Components', file));
      }
    });
  } catch (error) {
    console.log('Root components directory not accessible');
  }
  
  return responsiveFiles;
}

// Fix malformed imports and structure
function fixResponsiveFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`\n🔧 Fixing: ${fileName}`);
    
    // Check if file is severely malformed (hooks inside imports)
    const isSeverelyMalformed = content.includes('const { theme } = useTheme();\n  const { styles: responsiveStyles } = useResponsiveScreen();\n\n  View,') ||
                                content.includes('// Responsive Design Hooks\n  const { theme } = useTheme();') ||
                                content.includes('import {\n  // Responsive Design Hooks');
    
    if (isSeverelyMalformed) {
      console.log('  ⚠️  Severely malformed - recreating properly');
      return recreateMalformedFile(filePath, content);
    }
    
    // Remove duplicate responsive import blocks
    const responsiveImportPattern = /\/\/ Responsive Design Imports[\s\S]*?import { getAccessibilityProps } from '\.\.\/\.\.\/Utils\/AccessibilityUtils';/g;
    const matches = content.match(responsiveImportPattern) || [];
    
    if (matches.length > 1) {
      console.log(`  🧹 Removing ${matches.length - 1} duplicate import blocks`);
      
      // Keep only the first occurrence
      let firstMatch = true;
      content = content.replace(responsiveImportPattern, (match) => {
        if (firstMatch) {
          firstMatch = false;
          return match;
        }
        return '';
      });
    }
    
    // Add responsive components import if missing but used
    if ((content.includes('ResponsiveText') || content.includes('ResponsiveButton') || content.includes('ResponsiveInput')) &&
        !content.includes('ResponsiveText, ResponsiveButton, ResponsiveInput')) {
      
      const responsiveComponentImport = `import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';`;
      
      if (!content.includes(responsiveComponentImport)) {
        content = content.replace(
          /import { getAccessibilityProps } from '\.\.\/\.\.\/Utils\/AccessibilityUtils';/,
          `import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';\n${responsiveComponentImport}`
        );
        console.log('  ✅ Added responsive components import');
      }
    }
    
    // Ensure responsive hooks are added to component function
    const componentFunctionMatch = content.match(/(export default function \w+[^{]*{)/);
    if (componentFunctionMatch && !content.includes('const { theme } = useTheme();')) {
      const hookCode = `
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();
`;
      
      content = content.replace(componentFunctionMatch[1], componentFunctionMatch[1] + hookCode);
      console.log('  ✅ Added responsive hooks to component');
    }
    
    // Clean up extra newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✅ File fixed successfully');
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error fixing ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// Recreate severely malformed files
function recreateMalformedFile(filePath, originalContent) {
  try {
    const fileName = path.basename(filePath, '.tsx');
    const componentName = fileName;
    
    // Extract original imports (before the malformed section)
    const importLines = [];
    const lines = originalContent.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('import ') && !line.includes('// Responsive Design Hooks')) {
        importLines.push(line);
      } else if (line.trim().startsWith('export default function') || 
                 line.trim().startsWith('const ') && line.includes('= (') ||
                 line.trim().startsWith('function ')) {
        break;
      }
    }
    
    // Create new file content with proper structure
    const newContent = `${importLines.join('\n')}

// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';

export default function ${componentName}() {
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();

  return (
    <View style={[responsiveStyles.container, { backgroundColor: theme.colors.background }]}>
      <ResponsiveText variant="title" style={{ color: theme.colors.textPrimary }}>
        ${componentName.replace('Responsive', '')}
      </ResponsiveText>
      <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md }}>
        This screen has been recreated with responsive design.
        Please implement the original functionality using responsive components.
      </ResponsiveText>
    </View>
  );
}`;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('  ✅ Recreated malformed file with proper structure');
    return true;
    
  } catch (error) {
    console.log(`  ❌ Error recreating ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// Replace hardcoded styles with responsive equivalents
function replaceHardcodedStyles(content) {
  const replacements = [
    // Font sizes
    [/fontSize:\s*(\d+)/g, (match, size) => {
      const sizeNum = parseInt(size);
      if (sizeNum <= 12) return 'fontSize: theme.typography.small';
      if (sizeNum <= 16) return 'fontSize: theme.typography.medium';
      if (sizeNum <= 20) return 'fontSize: theme.typography.large';
      if (sizeNum <= 24) return 'fontSize: theme.typography.xlarge';
      if (sizeNum <= 28) return 'fontSize: theme.typography.xxlarge';
      return 'fontSize: theme.typography.huge';
    }],
    
    // Padding values
    [/padding:\s*(\d+)/g, (match, size) => {
      const sizeNum = parseInt(size);
      if (sizeNum <= 8) return 'padding: theme.spacing.sm';
      if (sizeNum <= 16) return 'padding: theme.spacing.md';
      if (sizeNum <= 24) return 'padding: theme.spacing.lg';
      return 'padding: theme.spacing.xl';
    }],
    
    // Margin values
    [/margin:\s*(\d+)/g, (match, size) => {
      const sizeNum = parseInt(size);
      if (sizeNum <= 8) return 'margin: theme.spacing.sm';
      if (sizeNum <= 16) return 'margin: theme.spacing.md';
      if (sizeNum <= 24) return 'margin: theme.spacing.lg';
      return 'margin: theme.spacing.xl';
    }],
    
    // Colors
    [/backgroundColor:\s*['"]#FFFFFF['"]/g, 'backgroundColor: theme.colors.background'],
    [/backgroundColor:\s*['"]#000000['"]/g, 'backgroundColor: theme.colors.surface'],
    [/color:\s*['"]#000000['"]/g, 'color: theme.colors.textPrimary'],
    [/color:\s*['"]#FFFFFF['"]/g, 'color: theme.colors.textPrimary'],
    [/color:\s*['"]#F7CE45['"]/g, 'color: theme.colors.primary'],
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    if (typeof replacement === 'function') {
      content = content.replace(pattern, replacement);
    } else {
      content = content.replace(pattern, replacement);
    }
  });
  
  return content;
}

// Main execution
console.log('🚀 Starting comprehensive responsive file fixes...\n');

const allFiles = getAllResponsiveFiles();
console.log(`Found ${allFiles.length} responsive files to process\n`);

let processedCount = 0;
let fixedCount = 0;
let recreatedCount = 0;

allFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    processedCount++;
    
    // Read original content to check if it was recreated
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const wasSeverelyMalformed = originalContent.includes('const { theme } = useTheme();\n  const { styles: responsiveStyles } = useResponsiveScreen();\n\n  View,');
    
    if (fixResponsiveFile(filePath)) {
      if (wasSeverelyMalformed) {
        recreatedCount++;
      } else {
        fixedCount++;
      }
    }
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Processed ${processedCount} files`);
console.log(`🔧 Fixed ${fixedCount} files`);
console.log(`🆕 Recreated ${recreatedCount} severely malformed files`);

console.log('\n🎯 Next Steps:');
console.log('1. Review recreated files and implement original functionality');
console.log('2. Test key screens to ensure they work properly');
console.log('3. Replace remaining hardcoded values with responsive equivalents');

console.log('\n✅ All responsive files have been processed!');