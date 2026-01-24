const { exec } = require('child_process');
const fs = require('fs');

// Create a JavaScript bookmarklet that extracts network data from Safari console
const bookmarklet = `
javascript:(function(){
  // Extract all fetch/XHR network data from Safari's performance API
  const resources = performance.getEntriesByType('resource');
  const meshyRequests = resources.filter(r => r.name.includes('meshy.ai'));

  console.log('Found', meshyRequests.length, 'Meshy API requests');
  console.log(JSON.stringify(meshyRequests.map(r => r.name), null, 2));

  // Try to access cached responses
  const taskIds = [];

  // Check if we can access fetch cache
  if (window.caches) {
    caches.keys().then(keys => {
      keys.forEach(key => {
        caches.open(key).then(cache => {
          cache.keys().then(requests => {
            requests.forEach(req => {
              if (req.url.includes('meshy.ai')) {
                cache.match(req).then(response => {
                  response.json().then(data => {
                    console.log('Cached data:', data);
                  });
                });
              }
            });
          });
        });
      });
    });
  }

  // Check window for any Meshy data
  for (let key in window) {
    if (typeof window[key] === 'object' && window[key] !== null) {
      const str = JSON.stringify(window[key]);
      if (str && str.includes('meshy') || str.includes('task')) {
        console.log('Found potential data in window.' + key);
      }
    }
  }

  alert('Check console for Meshy data. Copy any task IDs found.');
})();
`;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  SAFARI CONSOLE DATA EXTRACTION                               ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('Run this bookmarklet in Safari while on https://app.meshy.ai/my-assets:\n');
console.log(bookmarklet);
console.log('\n\nOR paste this into Safari console:\n');

const consoleScript = `
// Extract network data from Safari
const resources = performance.getEntriesByType('resource');
const meshyAPIs = resources.filter(r => r.name.includes('api.meshy.ai'));
console.log('Meshy API calls:', meshyAPIs.map(r => r.name));

// Try to find task IDs in the DOM
const taskIds = {};
document.querySelectorAll('*').forEach(el => {
  // Check for task IDs in attributes
  for (let attr of el.attributes || []) {
    if (attr.value && attr.value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
      const id = attr.value.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)[1];
      const name = el.textContent?.trim().substring(0, 50) || el.alt || el.title || 'unknown';
      taskIds[name] = id;
    }
  }

  // Check element IDs
  if (el.id && el.id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
    taskIds[el.textContent?.trim().substring(0, 50) || 'unknown'] = el.id;
  }
});

console.log('Found task IDs:', taskIds);
console.log('\\nCopy this JSON:');
console.log(JSON.stringify(taskIds, null, 2));
`;

console.log(consoleScript);

console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  After running the above, paste the JSON output here:         ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('\nSave to: meshy-task-ids.json');
