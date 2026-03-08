#!/usr/bin/env node

/**
 * Console Log Cleanup Script
 * 
 * This script:
 * 1. Removes unnecessary console.log statements (debugging, empty logs)
 * 2. Wraps important console statements with __DEV__ check
 * 3. Preserves console.error and console.warn for production debugging
 * 
 * Usage: node scripts/cleanup-console-logs.js [options]
 * 
 * Options:
 *   --dry-run    Show what would be changed without modifying files
 *   --path       Specify custom path (default: src)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  // Patterns to completely remove (debugging statements)
  REMOVE_PATTERNS: [
    /console\.log\(['"]called['"]\)/g,
    /console\.log\(['"]ss['"]\)/g,
    /console\.log\(['"]request['"],/g,
    /console\.log\(['"]whitslistcount['"]\)/g,
    /\/\/\s*console\.log\(/g, // Already commented out
    /console\.log\(\s*\)/g, // Empty console.log()
  ],

  // Patterns to keep as-is (already wrapped or critical)
  KEEP_AS_IS_PATTERNS: [
    /if\s*\(__DEV__\)\s*console\./g,
    /__DEV__\s*&&\s*console\./g,
  ],

  // File extensions to process
  EXTENSIONS: ['.ts', '.tsx', '.js', '.jsx'],

  // Directories to skip
  SKIP_DIRS: ['node_modules', '.git', 'android', 'ios', '__tests__', 'build', 'dist'],
};

class ConsoleLogCleaner {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.basePath = options.path || 'src';
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      logsRemoved: 0,
      logsWrapped: 0,
    };
  }

  // Check if line should be kept as-is
  shouldKeepAsIs(line) {
    return config.KEEP_AS_IS_PATTERNS.some(pattern => pattern.test(line));
  }

  // Check if line should be removed
  shouldRemove(line) {
    return config.REMOVE_PATTERNS.some(pattern => pattern.test(line));
  }

  // Process a single line
  processLine(line, index, lines) {
    const trimmed = line.trim();

    // Skip if already wrapped with __DEV__
    if (this.shouldKeepAsIs(line)) {
      return { line, modified: false };
    }

    // Remove unnecessary logs
    if (this.shouldRemove(line)) {
      this.stats.logsRemoved++;
      return { line: '', modified: true, removed: true };
    }

    // Wrap console.log with __DEV__
    if (trimmed.startsWith('console.log(')) {
      const indent = line.match(/^\s*/)[0];
      const wrappedLine = `${indent}if (__DEV__) ${trimmed}`;
      this.stats.logsWrapped++;
      return { line: wrappedLine, modified: true };
    }

    // Wrap console.warn with __DEV__ (but keep for important warnings)
    if (trimmed.startsWith('console.warn(') && !trimmed.includes('Failed') && !trimmed.includes('Error')) {
      const indent = line.match(/^\s*/)[0];
      const wrappedLine = `${indent}if (__DEV__) ${trimmed}`;
      this.stats.logsWrapped++;
      return { line: wrappedLine, modified: true };
    }

    // Keep console.error as-is (important for production)
    return { line, modified: false };
  }

  // Process a file
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let modified = false;
      const newLines = [];

      for (let i = 0; i < lines.length; i++) {
        const result = this.processLine(lines[i], i, lines);
        
        if (result.modified) {
          modified = true;
        }

        // Only add line if it wasn't removed
        if (!result.removed) {
          newLines.push(result.line);
        }
      }

      if (modified) {
        this.stats.filesModified++;
        
        if (!this.dryRun) {
          fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
          console.log(`✅ Modified: ${filePath}`);
        } else {
          console.log(`📝 Would modify: ${filePath}`);
        }
      }

      this.stats.filesProcessed++;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Recursively process directory
  processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!config.SKIP_DIRS.includes(entry.name)) {
          this.processDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (config.EXTENSIONS.includes(ext)) {
          this.processFile(fullPath);
        }
      }
    }
  }

  // Run the cleanup
  run() {
    console.log('🧹 Console Log Cleanup Script');
    console.log(`📂 Processing: ${this.basePath}`);
    console.log(`🔧 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}\n`);

    this.processDirectory(this.basePath);

    console.log('\n📊 Summary:');
    console.log(`   Files processed: ${this.stats.filesProcessed}`);
    console.log(`   Files modified: ${this.stats.filesModified}`);
    console.log(`   Logs removed: ${this.stats.logsRemoved}`);
    console.log(`   Logs wrapped with __DEV__: ${this.stats.logsWrapped}`);

    if (this.dryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  path: args.find(arg => arg.startsWith('--path='))?.split('=')[1] || 'src',
};

// Run the cleaner
const cleaner = new ConsoleLogCleaner(options);
cleaner.run();
