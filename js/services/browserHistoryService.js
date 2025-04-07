export function getBrowserHistoryService(date) {
    return new Promise((resolve) => {
        const startTime = new Date(date);
        startTime.setHours(0, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(23, 59, 59, 999);
        
        chrome.history.search({
            text: '',
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            maxResults: 100
        }, function(historyItems) {
            resolve(historyItems || []);
        });
    });
}