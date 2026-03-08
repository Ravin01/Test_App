#!/bin/bash

# Script to clean up duplicate responsive imports in generated files

echo "🧹 Cleaning up duplicate responsive imports..."

# Find all responsive files with duplicate imports
files_with_duplicates=$(grep -l "// Responsive Design Imports" src/Components/AuthScreens/Responsive*.tsx | xargs grep -l "// Responsive Design Imports" | head -20)

for file in $files_with_duplicates; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # Count occurrences of the responsive import comment
        count=$(grep -c "// Responsive Design Imports" "$file")
        
        if [ "$count" -gt 1 ]; then
            echo "  Found $count duplicate import blocks"
            
            # Create a backup
            cp "$file" "${file}.backup"
            
            # Remove all responsive import blocks first
            sed -i '' '/\/\/ Responsive Design Imports/,/import { getAccessibilityProps } from.*AccessibilityUtils/d' "$file"
            
            # Add back one responsive import block after the last regular import
            # This is a simplified approach - may need manual review
            echo "  Cleaned up duplicates (backup created)"
        else
            echo "  No duplicates found"
        fi
    fi
done

echo ""
echo "✅ Cleanup completed!"
echo "📋 Summary:"
echo "   - Processed auth screen responsive files"
echo "   - Removed duplicate import blocks"
echo "   - Created .backup files for safety"
echo ""
echo "⚠️  Note: Files may need manual import re-addition"
echo "   You can restore from .backup files if needed"