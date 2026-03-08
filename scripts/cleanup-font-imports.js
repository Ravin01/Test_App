#!/usr/bin/env node

/**
 * Cleanup Script - Removes incorrect FontManager imports
 * Run this before re-running the fix script
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

let filesProcessed = 0;
let filesCleaned = 0;

function cleanFile(filePath) {
  try {
    filesProcessed++;
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove any import statements for FontManager
    content = content.replace(/^import\s+\{[^}]*getSafeFontStyle[^}]*\}\s+from\s+['"][^'"]*FontManager['"];?\s*\n?/gm, '');
    
    // Remove any ...getSafeFontStyle() calls and replace with original fontWeight
    // This is a simplified cleanup - it will restore fontWeight usage
    content = content.replace(/\.\.\.getSafeFontStyle\(['"]([^'"]+)['"]\)/g, "fontWeight: '$1'");
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesCleaned++;
      console.log(colors.green + '✓' + colors.reset + ' Cleaned: ' + filePath);
    }
  } catch (error) {
    console.error(colors.red + '✗' + colors.reset + ' Error cleaning ' + filePath + ':', error.message);
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (['node_modules', 'build', 'dist', 'android', 'ios', '__tests__'].includes(entry.name)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile() && ['.tsx', '.ts'].includes(path.extname(fullPath))) {
      const fileName = path.basename(fullPath);
      if (fileName !== 'FontManager.tsx' && fileName !== 'AccessibilityUtils.tsx') {
        cleanFile(fullPath);
      }
    }
  }
}

function main() {
  console.log(colors.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log(colors.blue + '  FontManager Import Cleanup' + colors.reset);
  console.log(colors.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log();
  
  const srcPath = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.error(colors.red + 'Error: src directory not found' + colors.reset);
    process.exit(1);
  }
  
  console.log(colors.blue + 'Cleaning files...' + colors.reset);
  console.log();
  
  processDirectory(srcPath);
  
  console.log();
  console.log(colors.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log(colors.green + 'Summary:' + colors.reset);
  console.log('  Files scanned: ' + filesProcessed);
  console.log('  Files cleaned: ' + colors.green + filesCleaned + colors.reset);
  console.log(colors.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log();
  console.log(colors.yellow + 'Next step:' + colors.reset + ' Run: node scripts/fix-font-accessibility.js');
  console.log();
}

main();
