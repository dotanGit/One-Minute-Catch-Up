// Keep track of download source URLs
const downloadSources = new Map();

// Listen for download creation and store the current tab URL
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (tab?.url) {
            downloadSources.set(downloadItem.id, tab.url);
        }
    } catch (error) {
        console.error('Error getting tab URL for download:', error);
    }
});

export function getDownloadsService(date) {
    return new Promise((resolve) => {
        const startTime = new Date(date);
        startTime.setHours(0, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(23, 59, 59, 999);
        
        chrome.downloads.search({
            startedAfter: startTime.toISOString(),
            startedBefore: endTime.toISOString(),
            orderBy: ['-startTime']
        }, function(downloads) {
            // Add the source URL to each download
            downloads = downloads.map(download => ({
                ...download,
                sourceUrl: downloadSources.get(download.id) || download.url
            }));
            resolve(downloads || []);
        });
    });
} 