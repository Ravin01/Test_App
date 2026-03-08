const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'Components', 'Dashboard.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove commented out console statements
content = content.replace(/\s*\/\/\s*console\.(log|error|warn|info|debug)\([^)]*\);?\s*/g, '\n');

// Remove active console.log, console.warn statements (keep console.error for critical errors)
content = content.replace(/\s*console\.(log|warn|info|debug)\([^;]*\);?\s*/g, '\n');

// Clean up multiple consecutive empty lines
content = content.replace(/\n{3,}/g, '\n\n');

// Write back to file
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully removed console statements from Dashboard.tsx');
console.log('Note: console.error statements were kept for critical error handling');
