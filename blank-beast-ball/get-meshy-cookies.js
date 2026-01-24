const puppeteer = require('puppeteer');
const fs = require('fs');

async function getMeshyCookies() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();

    console.log('Opening Meshy...');
    console.log('Please log in manually in the browser window.');
    console.log('Press Enter in this terminal when you are logged in and on the My Assets page...');

    await page.goto('https://app.meshy.ai/my-assets');

    // Wait for user input
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    // Get cookies
    const cookies = await page.cookies();
    fs.writeFileSync('meshy-cookies.json', JSON.stringify(cookies, null, 2));
    console.log('Cookies saved to meshy-cookies.json');

    // Get local storage
    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
    fs.writeFileSync('meshy-localstorage.json', localStorage);
    console.log('Local storage saved to meshy-localstorage.json');

    await browser.close();
}

getMeshyCookies().catch(console.error);
