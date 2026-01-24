// Inject network capture into Safari before page loads
// This captures XHR/fetch requests to Meshy API

function run() {
    const safari = Application('Safari');
    safari.includeStandardAdditions = true;

    if (safari.windows.length === 0) {
        console.log('Error: No Safari windows open');
        return JSON.stringify({error: 'No Safari windows'});
    }

    // Script to hook fetch and XMLHttpRequest
    const networkHookScript = `
    (function() {
        if (window.__meshyNetworkCapture) {
            return JSON.stringify(window.__meshyNetworkCapture);
        }

        window.__meshyNetworkCapture = {
            requests: [],
            started: new Date().toISOString()
        };

        // Hook fetch
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            const capture = {
                type: 'fetch',
                url: typeof url === 'string' ? url : url.url,
                timestamp: new Date().toISOString()
            };

            return originalFetch.apply(this, args).then(response => {
                const cloned = response.clone();
                if (capture.url.includes('meshy.ai')) {
                    cloned.text().then(body => {
                        capture.status = response.status;
                        capture.bodyPreview = body.substring(0, 1000);
                        window.__meshyNetworkCapture.requests.push(capture);
                    }).catch(() => {});
                }
                return response;
            });
        };

        // Hook XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this.__captureInfo = {
                type: 'xhr',
                method: method,
                url: url,
                timestamp: new Date().toISOString()
            };
            return originalOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function(...args) {
            if (this.__captureInfo && this.__captureInfo.url.includes('meshy.ai')) {
                const info = this.__captureInfo;
                this.addEventListener('load', function() {
                    info.status = this.status;
                    info.responsePreview = this.responseText.substring(0, 1000);
                    window.__meshyNetworkCapture.requests.push(info);
                });
            }
            return originalSend.apply(this, args);
        };

        return JSON.stringify({message: 'Network capture installed. Refresh or navigate to trigger requests.'});
    })();
    `;

    try {
        const result = safari.doJavaScript(networkHookScript, {in: safari.windows[0].currentTab});
        return result;
    } catch (e) {
        return JSON.stringify({error: e.toString()});
    }
}
