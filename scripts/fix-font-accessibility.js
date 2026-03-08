#!/usr/bin/env node

/**
 * Automated Font Accessibility Fixer
 * Converts fontWeight usage to FontManager helpers to prevent text clipping
 * when bold text accessibility is enabled
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

let filesProcessed = 0;
let filesModified = 0;
let totalReplacements = 0;

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath);
  
  // Only process .tsx and .ts files
  if (!['.tsx', '.ts'].includes(ext)) return false;
  
  // Skip already processed files
  if (fileName === 'FontManager.tsx' || fileName === 'AccessibilityUtils.tsx') return false;
  
  // Skip test files
  if (fileName.includes('.test.') || fileName.includes('.spec.')) return false;
  
  return true;
}

/**
 * Check if file already imports FontManager
 */
function hasImport(content, importName) {
  const importRegex = new RegExp(`import.*${importName}.*from.*FontManager`, 'g');
  return importRegex.test(content);
}

/**
 * Calculate relative path from file to Utils/FontManager
 */
function getRelativePathToFontManager(filePath) {
  const srcDir = path.join(process.cwd(), 'src');
  const fontManagerPath = path.join(srcDir, 'Utils', 'FontManager');
  const fileDir = path.dirname(filePath);
  
  // Calculate relative path
  let relativePath = path.relative(fileDir, fontManagerPath);
  
  // Convert Windows backslashes to forward slashes
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

/**
 * Add FontManager import to file
 */
function addFontManagerImport(content, filePath) {
  // Check if FontManager import already exists
  if (hasImport(content, 'getSafeFontStyle')) {
    return content;
  }
  
  // Calculate correct relative path for this file
  const relativePath = getRelativePathToFontManager(filePath);
  const importStatement = `import { getSafeFontStyle } from '${relativePath}';`;
  
  // Find the last import statement
  const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    // No imports found, add at the beginning after any comments
    const firstNonComment = content.search(/^[^/\n]/m);
    if (firstNonComment === -1) return content;
    
    return content.slice(0, firstNonComment) + 
           importStatement + '\n\n' +
           content.slice(firstNonComment);
  }
  
  // Find position after last import
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;
  
  return content.slice(0, insertPosition) + 
         '\n' + importStatement +
         content.slice(insertPosition);
}

/**
 * Fix fontWeight in inline styles
 */
function fixInlineStyles(content) {
  let modified = content;
  let replacements = 0;
  
  // Pattern: style={{ fontWeight: 'bold' }} or similar
  const inlinePattern = /style=\{\{([^}]*?)fontWeight\s*:\s*['"`]?(bold|normal|\d+)['"`]?([^}]*?)\}\}/g;
  
  modified = modified.replace(inlinePattern, (match, before, weight, after) => {
    replacements++;
    // Convert to use getSafeFontStyle
    const cleanBefore = before.trim();
    const cleanAfter = after.trim();
    
    let newStyle = 'style={{';
    if (cleanBefore && cleanBefore !== ',') {
      newStyle += cleanBefore;
      if (!cleanBefore.endsWith(',')) newStyle += ',';
    }
    newStyle += `...getSafeFontStyle('${weight}')`;
    if (cleanAfter && cleanAfter !== ',') {
      if (!cleanAfter.startsWith(',')) newStyle += ',';
      newStyle += cleanAfter;
    }
    newStyle += '}}';
    
    return newStyle;
  });
  
  return { content: modified, replacements };
}

/**
 * Fix fontWeight in StyleSheet.create
 */
function fixStyleSheets(content) {
  let modified = content;
  let replacements = 0;
  
  // Pattern: fontWeight: 'bold', in StyleSheet
  const styleSheetPattern = /(\s+)fontWeight\s*:\s*['"`]?(bold|normal|\d+)['"`]?\s*,?\s*$/gm;
  
  modified = modified.replace(styleSheetPattern, (match, indent, weight) => {
    replacements++;
    // Replace with ...getSafeFontStyle spread
    return `${indent}...getSafeFontStyle('${weight}'),`;
  });
  
  return { content: modified, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    filesProcessed++;
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Check if file has fontWeight usage
    if (!content.includes('fontWeight')) {
      return;
    }
    
    let totalFileReplacements = 0;
    
    // Fix inline styles
    const inlineResult = fixInlineStyles(content);
    content = inlineResult.content;
    totalFileReplacements += inlineResult.replacements;
    
    // Fix StyleSheet styles
    const styleSheetResult = fixStyleSheets(content);
    content = styleSheetResult.content;
    totalFileReplacements += styleSheetResult.replacements;
    
    // If we made replacements, add import and save
    if (totalFileReplacements > 0) {
      content = addFontManagerImport(content, filePath);
      
      // Only write if content actually changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesModified++;
        totalReplacements += totalFileReplacements;
        
        console.log(
          colors.green + '✓' + colors.reset + ' ' + filePath + ' ' + 
          colors.yellow + '(' + totalFileReplacements + ' fixes)' + colors.reset
        );
      }
    }
  } catch (error) {
    console.error(colors.red + '✗' + colors.reset + ' Error processing ' + filePath + ':', error.message);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, build directories, etc.
      if (['node_modules', 'build', 'dist', 'android', 'ios', '__tests__'].includes(entry.name)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      processFile(fullPath);
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}  Font Accessibility Auto-Fixer${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const srcPath = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.error(`${colors.red}Error: src directory not found${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.blue}Processing files...${colors.reset}\n`);
  
  processDirectory(srcPath);
  
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}Summary:${colors.reset}`);
  console.log(`  Files scanned: ${filesProcessed}`);
  console.log(`  Files modified: ${colors.green}${filesModified}${colors.reset}`);
  console.log(`  Total replacements: ${colors.green}${totalReplacements}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  if (filesModified > 0) {
    console.log(`${colors.yellow}⚠ Important:${colors.reset}`);
    console.log(`  1. Review the changes before committing`);
    console.log(`  2. Test your app with bold text enabled`);
    console.log(`  3. Some complex cases may need manual adjustment\n`);
  }
}

// Run the script
main();
