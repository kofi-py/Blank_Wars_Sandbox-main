#!/usr/bin/env node

/**
 * Diagnostic script to see what's currently in Safari
 * Helps debug what data is available on the page
 */

const { execSync } = require('child_process');

const diagnosticScript = `
const safari = Application('Safari');
if (safari.windows.length === 0) {
    JSON.stringify({error: 'No Safari windows'});
} else {
    const url = safari.windows[0].currentTab.url();
    const name = safari.windows[0].currentTab.name();

    const pageInfo = \`
    (function() {
        const info = {
            url: window.location.href,
            title: document.title,
            hasReact: !!document.querySelector('[data-reactroot], [data-reactid]'),
            hasVue: !!window.__VUE__,
            imageCount: document.querySelectorAll('img').length,
            linkCount: document.querySelectorAll('a').length,
            scriptCount: document.querySelectorAll('script').length,
            dataElements: document.querySelectorAll('[data-id], [data-task-id]').length,
            meshyRequests: performance.getEntriesByType('resource').filter(r => r.name.includes('meshy.ai')).length,
            bodyPreview: document.body.textContent.substring(0, 200)
        };

        // Look for common state containers
        if (window.__INITIAL_STATE__) info.hasInitialState = true;
        if (window.__PRELOADED_STATE__) info.hasPreloadedState = true;
        if (window.__NEXT_DATA__) info.hasNextData = true;

        return JSON.stringify(info, null, 2);
    })();
    \`;

    const result = safari.doJavaScript(pageInfo, {in: safari.windows[0].currentTab});

    JSON.stringify({
        tabUrl: url,
        tabName: name,
        pageInfo: JSON.parse(result)
    }, null, 2);
}
`;

try {
    const result = execSync(`osascript -l JavaScript -e '${diagnosticScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf-8' });
    console.log('=== Safari Page Diagnostic ===\n');
    const data = JSON.parse(result.trim());

    console.log('Tab Information:');
    console.log(`  URL: ${data.tabUrl}`);
    console.log(`  Title: ${data.tabName}\n`);

    if (data.pageInfo) {
        console.log('Page Analysis:');
        console.log(`  Actual URL: ${data.pageInfo.url}`);
        console.log(`  Page Title: ${data.pageInfo.title}`);
        console.log(`  Framework: ${data.pageInfo.hasReact ? 'React' : data.pageInfo.hasVue ? 'Vue' : 'Unknown'}`);
        console.log(`  Images: ${data.pageInfo.imageCount}`);
        console.log(`  Links: ${data.pageInfo.linkCount}`);
        console.log(`  Scripts: ${data.pageInfo.scriptCount}`);
        console.log(`  Data elements: ${data.pageInfo.dataElements}`);
        console.log(`  Meshy network requests: ${data.pageInfo.meshyRequests}`);

        if (data.pageInfo.hasInitialState) console.log('  ✓ Has __INITIAL_STATE__');
        if (data.pageInfo.hasPreloadedState) console.log('  ✓ Has __PRELOADED_STATE__');
        if (data.pageInfo.hasNextData) console.log('  ✓ Has __NEXT_DATA__ (Next.js)');

        console.log(`\nPage content preview:\n"${data.pageInfo.bodyPreview}..."\n`);
    }

    console.log('\n=== Recommendations ===');
    if (data.tabUrl && data.tabUrl.includes('meshy.ai')) {
        console.log('✓ Safari is on Meshy page');
        if (data.pageInfo.meshyRequests > 0) {
            console.log(`✓ Found ${data.pageInfo.meshyRequests} Meshy API requests`);
            console.log('\nNext: Run the extraction script');
        } else {
            console.log('⚠ No Meshy API requests captured yet');
            console.log('\nNext: Refresh the page (Cmd+R) to trigger API calls');
        }
    } else {
        console.log('✗ Safari is not on Meshy page');
        console.log('\nNext: Navigate to https://app.meshy.ai/my-assets');
    }

} catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure:');
    console.log('1. Safari is open');
    console.log('2. "Allow JavaScript from Apple Events" is enabled');
    console.log('   (Safari > Develop > Allow JavaScript from Apple Events)');
}
