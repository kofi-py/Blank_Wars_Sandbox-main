#!/usr/bin/osascript -l JavaScript

function run() {
    const safari = Application('Safari');
    const script = `
        (function() {
            const taskIds = {};
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

            document.querySelectorAll('img[src*="meshy"], a[href*="meshy"], div[class*="asset"], div[class*="model"]').forEach(el => {
                const html = el.outerHTML;
                const matches = html.match(uuidRegex);
                if (matches) {
                    matches.forEach(id => {
                        const name = el.getAttribute('aria-label') || el.getAttribute('title') || el.alt || el.textContent?.trim().substring(0, 50) || 'model';
                        taskIds[id] = name;
                    });
                }
            });

            return JSON.stringify(taskIds, null, 2);
        })();
    `;

    try {
        const result = safari.doJavaScript(script, { in: safari.windows[0].currentTab });
        console.log(result);
    } catch (e) {
        console.log("Error: " + e.toString());
    }
}
