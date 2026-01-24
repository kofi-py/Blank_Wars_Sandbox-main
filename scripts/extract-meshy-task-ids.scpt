// Extract Meshy model task IDs from Safari by injecting a network monitoring script
// Requires: Safari > Develop > Allow JavaScript from Apple Events

function run() {
    const safari = Application('Safari');
    safari.includeStandardAdditions = true;

    if (safari.windows.length === 0) {
        console.log('Error: No Safari windows open');
        return JSON.stringify({error: 'No Safari windows'});
    }

    // Script to inject into the page
    const extractScript = `
    (function() {
        // Function to extract task IDs from the page's network data
        const taskIds = new Map();

        // 1. Check for React/Vue component data in the DOM
        // Many SPAs store data in special attributes or global objects
        if (window.__INITIAL_STATE__ || window.__PRELOADED_STATE__) {
            const state = window.__INITIAL_STATE__ || window.__PRELOADED_STATE__;
            console.log('Found app state:', state);
        }

        // 2. Look for task IDs in image src attributes (thumbnails often include task ID)
        const images = document.querySelectorAll('img[src*="meshy"], img[src*="task"]');
        images.forEach(img => {
            const match = img.src.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (match) {
                const id = match[1];
                const alt = img.alt || img.title || 'unknown';
                taskIds.set(id, {
                    id: id,
                    name: alt,
                    source: 'img_src',
                    url: img.src
                });
            }
        });

        // 3. Look in all link hrefs
        const links = document.querySelectorAll('a[href*="task"], a[href*="meshy"]');
        links.forEach(link => {
            const match = link.href.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (match) {
                const id = match[1];
                const text = link.textContent.trim() || link.title || 'unknown';
                if (!taskIds.has(id) || taskIds.get(id).name === 'unknown') {
                    taskIds.set(id, {
                        id: id,
                        name: text,
                        source: 'link_href',
                        url: link.href
                    });
                }
            }
        });

        // 4. Look in all data-* attributes
        const allElements = document.querySelectorAll('[data-id], [data-task-id], [data-model-id]');
        allElements.forEach(el => {
            const id = el.dataset.id || el.dataset.taskId || el.dataset.modelId;
            if (id && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
                const name = el.textContent.trim().split('\\n')[0] || el.title || el.alt || 'unknown';
                taskIds.set(id, {
                    id: id,
                    name: name,
                    source: 'data_attribute',
                    element: el.tagName
                });
            }
        });

        // 5. Use Performance API to get all network requests
        const resources = performance.getEntriesByType('resource');
        const meshyRequests = resources.filter(r =>
            r.name.includes('meshy.ai') &&
            (r.name.includes('/text-to-3d/') || r.name.includes('/image-to-3d/') || r.name.includes('/tasks/'))
        );

        meshyRequests.forEach(req => {
            const match = req.name.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (match) {
                const id = match[1];
                if (!taskIds.has(id)) {
                    taskIds.set(id, {
                        id: id,
                        name: 'from_network',
                        source: 'performance_api',
                        url: req.name
                    });
                }
            }
        });

        // 6. Check the page's JSON-LD or script tags
        const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
        scripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                const str = JSON.stringify(data);
                const matches = str.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi);
                if (matches) {
                    matches.forEach(id => {
                        if (!taskIds.has(id)) {
                            taskIds.set(id, {
                                id: id,
                                name: 'from_json',
                                source: 'script_tag'
                            });
                        }
                    });
                }
            } catch (e) {}
        });

        // Return as array
        return JSON.stringify(Array.from(taskIds.values()), null, 2);
    })();
    `;

    try {
        const result = safari.doJavaScript(extractScript, {in: safari.windows[0].currentTab});
        return result;
    } catch (e) {
        return JSON.stringify({error: e.toString()});
    }
}
