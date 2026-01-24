#!/usr/bin/env node

/**
 * Script to clear frontend cache/storage that might contain stale character data
 * This helps resolve "Missing financialPersonality" errors caused by cached characters
 * that don't exist in the current session.
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing frontend cache and storage...');

// Clear Next.js cache
const nextDir = path.join(__dirname, 'frontend/.next');
if (fs.existsSync(nextDir)) {
  console.log('🗑️  Removing Next.js cache directory...');
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ Next.js cache cleared');
} else {
  console.log('ℹ️  No Next.js cache found');
}

// Create a simple HTML file to clear browser storage
const clearStorageHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Clear Blank Wars Cache</title>
</head>
<body>
    <h1>Clearing Blank Wars Cache...</h1>
    <p id="status">Working...</p>
    
    <script>
        console.log('🧹 Clearing localStorage and sessionStorage...');
        
        // Clear all localStorage
        localStorage.clear();
        console.log('✅ localStorage cleared');
        
        // Clear all sessionStorage  
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
        
        // Clear cookies for localhost
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        console.log('✅ Cookies cleared');
        
        document.getElementById('status').innerHTML = 
            '<h2 style="color: green;">✅ Cache cleared successfully!</h2>' +
            '<p>You can now close this window and refresh localhost:3007</p>' +
            '<p><strong>Character data has been reset.</strong></p>';
            
        // Auto-close after 3 seconds
        setTimeout(() => {
            window.close();
        }, 3000);
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'clear-cache.html'), clearStorageHtml);

console.log('');
console.log('🌐 Created clear-cache.html');
console.log('');
console.log('📋 To clear browser storage:');
console.log('   1. Open: file://' + path.join(__dirname, 'clear-cache.html'));
console.log('   2. Or run: open clear-cache.html');
console.log('   3. Then refresh localhost:3007');
console.log('');
console.log('✅ Frontend cache clearing setup complete!');