#!/bin/bash

# This script injects JavaScript into the active Safari tab using remote debugging

# Enable Safari's remote debugging on port 9222
# Safari > Develop > Allow Remote Automation

# Use webkit2gtk or similar to connect to Safari's debugging port
# and inject JavaScript that extracts task IDs

cat > /tmp/extract_task_ids.js << 'SCRIPT'
const taskIds = {};
const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Method 1: Scan all DOM elements
document.querySelectorAll('*').forEach(el => {
  const html = el.outerHTML;
  const matches = html.match(uuidRegex);
  if (matches) {
    matches.forEach(id => {
      const name = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim().substring(0, 50) || 'unknown';
      if (!taskIds[id]) {
        taskIds[id] = name;
      }
    });
  }
});

// Method 2: Check all image srcs (thumbnails likely have task IDs)
document.querySelectorAll('img').forEach(img => {
  const matches = img.src.match(uuidRegex);
  if (matches) {
    matches.forEach(id => {
      const name = img.alt || img.title || img.closest('[aria-label]')?.getAttribute('aria-label') || 'unknown';
      if (!taskIds[id]) {
        taskIds[id] = name;
      }
    });
  }
});

// Method 3: Check all hrefs
document.querySelectorAll('a[href]').forEach(a => {
  const matches = a.href.match(uuidRegex);
  if (matches) {
    matches.forEach(id => {
      const name = a.textContent?.trim() || a.getAttribute('aria-label') || 'unknown';
      if (!taskIds[id]) {
        taskIds[id] = name;
      }
    });
  }
});

// Method 4: Check React/Vue component data
const reactKeys = Object.keys(window).filter(k => k.startsWith('__REACT') || k.startsWith('__VUE'));
reactKeys.forEach(key => {
  try {
    const str = JSON.stringify(window[key]);
    const matches = str.match(uuidRegex);
    if (matches) {
      console.log('Found in ' + key + ':', matches);
    }
  } catch(e) {}
});

// Return results
JSON.stringify(taskIds, null, 2);
SCRIPT

echo "Attempting to connect to Safari via debugging protocol..."

# Try using Safari's AppleScript with JavaScript injection
osascript -l JavaScript << 'APPLESCRIPT'
const safari = Application('Safari');
safari.includeStandardAdditions = true;

const script = `
const taskIds = {};
const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

document.querySelectorAll('*').forEach(el => {
  const html = el.outerHTML;
  const matches = html.match(uuidRegex);
  if (matches) {
    matches.forEach(id => {
      const name = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim().substring(0, 50) || 'unknown';
      taskIds[id] = name;
    });
  }
});

document.querySelectorAll('img').forEach(img => {
  const matches = img.src.match(uuidRegex);
  if (matches) {
    matches.forEach(id => {
      const name = img.alt || img.title || 'unknown';
      taskIds[id] = name;
    });
  }
});

JSON.stringify(taskIds, null, 2);
`;

try {
    const result = safari.doJavaScript(script, { in: safari.windows[0].currentTab });
    return result;
} catch (e) {
    return "Error: " + e.toString();
}
APPLESCRIPT
