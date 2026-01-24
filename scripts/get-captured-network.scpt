// Retrieve captured network data from Safari
// Run this AFTER capture-meshy-network.scpt and after refreshing the page

function run() {
    const safari = Application('Safari');
    safari.includeStandardAdditions = true;

    if (safari.windows.length === 0) {
        return JSON.stringify({error: 'No Safari windows open'});
    }

    const retrieveScript = `
    (function() {
        if (!window.__meshyNetworkCapture) {
            return JSON.stringify({
                error: 'Network capture not installed. Run capture script first.'
            });
        }

        return JSON.stringify(window.__meshyNetworkCapture, null, 2);
    })();
    `;

    try {
        const result = safari.doJavaScript(retrieveScript, {in: safari.windows[0].currentTab});
        return result;
    } catch (e) {
        return JSON.stringify({error: e.toString()});
    }
}
