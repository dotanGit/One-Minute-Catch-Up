import { normalizeDateToStartOfDay, safeToISOString } from '../utils/dateUtils.js';

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
        const startTime = normalizeDateToStartOfDay(date);
        const endTime = new Date(startTime);
        endTime.setUTCHours(23, 59, 59, 999);

        chrome.downloads.search({
            startedAfter: safeToISOString(startTime),
            startedBefore: safeToISOString(endTime),
            orderBy: ['-startTime']
        }, function(downloads) {
            resolve(downloads || []);
        });
    });
}
