import { normalizeDateToStartOfDay, safeToISOString } from '../utils/dateUtils.js';

// Keep track of download source URLs
const downloadSources = new Map();

// Listen for download creation and store the current tab URL
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
            downloadSources.set(downloadItem.id, tab.url);
        }
    } catch (error) {
        console.error('Error getting tab URL for download:', error);
    }
});

export function getDownloadsService(date) {
    return new Promise((resolve) => {
        // 🔄 Use local day range instead of UTC
        const startTime = normalizeDateToStartOfDay(date);
        const endTime = new Date(startTime.getTime() + 86400000); // +1 local day

        chrome.downloads.search({
            startedAfter: safeToISOString(startTime),
            startedBefore: safeToISOString(endTime),
            orderBy: ['-startTime']
        }, function(downloads) {
            resolve(downloads || []);
        });
    });
}
