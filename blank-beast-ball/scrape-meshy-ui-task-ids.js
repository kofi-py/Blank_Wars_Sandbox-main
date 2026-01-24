const puppeteer = require('puppeteer');
const fs = require('fs');

const MESHY_LOGIN_URL = 'https://app.meshy.ai/login';
const MESHY_ASSETS_URL = 'https://app.meshy.ai/my-assets';

async function scrapeMeshyTaskIds() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    try {
        const page = await browser.newPage();

        // Intercept network requests to capture API responses
        const taskIds = {};

        page.on('response', async (response) => {
            const url = response.url();

            // Look for workspace/assets API calls
            if (url.includes('api.meshy.ai') && (url.includes('workspace') || url.includes('assets') || url.includes('text-to-3d'))) {
                try {
                    const data = await response.json();
                    console.log(`\nCaptured API response from: ${url}`);

                    // Check if it's an array of assets
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            if (item.id && item.name) {
                                taskIds[item.name || item.id] = item.id;
                                console.log(`  Found: ${item.name || 'Unnamed'} -> ${item.id}`);
                            }
                        });
                    } else if (data.result && Array.isArray(data.result)) {
                        data.result.forEach(item => {
                            if (item.id && item.name) {
                                taskIds[item.name || item.id] = item.id;
                                console.log(`  Found: ${item.name || 'Unnamed'} -> ${item.id}`);
                            }
                        });
                    }
                } catch (e) {
                    // Not JSON, skip
                }
            }
        });

        console.log(`Navigating to ${MESHY_LOGIN_URL}...`);
        await page.goto(MESHY_LOGIN_URL, { waitUntil: 'networkidle2' });

        console.log('\n⚠️  MANUAL STEP REQUIRED:');
        console.log('Please log in to Meshy in the browser window that just opened.');
        console.log('After logging in successfully, the script will continue automatically...\n');

        // Wait for navigation to assets page (indicates successful login)
        await page.waitForFunction(
            () => window.location.href.includes('meshy.ai') && !window.location.href.includes('login'),
            { timeout: 300000 } // 5 minutes for user to log in
        );

        console.log('Login detected! Navigating to My Assets...');
        await page.goto(MESHY_ASSETS_URL, { waitUntil: 'networkidle2' });

        // Wait a bit for assets to load
        console.log('Waiting for assets to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Scroll to load more assets
        console.log('Scrolling to load all assets...');
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Try to extract task IDs from DOM as fallback
        const domTaskIds = await page.evaluate(() => {
            const ids = {};

            // Look for elements with task IDs in data attributes or IDs
            document.querySelectorAll('[data-task-id], [id*="task"]').forEach(el => {
                const taskId = el.getAttribute('data-task-id') || el.id;
                const name = el.getAttribute('data-name') || el.getAttribute('title') || el.innerText?.trim().substring(0, 50);
                if (taskId && taskId.includes('-')) {
                    ids[name || taskId] = taskId;
                }
            });

            // Look for links or images with task IDs in URLs
            document.querySelectorAll('a[href*="task"], img[src*="task"]').forEach(el => {
                const href = el.href || el.src;
                const match = href.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                if (match) {
                    const name = el.getAttribute('alt') || el.getAttribute('title') || el.innerText?.trim().substring(0, 50);
                    ids[name || match[0]] = match[0];
                }
            });

            return ids;
        });

        // Merge DOM-extracted IDs
        Object.assign(taskIds, domTaskIds);

        console.log('\n✓ Task IDs extracted:');
        console.log(JSON.stringify(taskIds, null, 2));

        // Save to file
        const outputPath = 'meshy-task-ids.json';
        fs.writeFileSync(outputPath, JSON.stringify(taskIds, null, 2));
        console.log(`\n✓ Saved task IDs to ${outputPath}`);

        return taskIds;

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the scraper
scrapeMeshyTaskIds().catch(console.error);
