export function getBrowserHistoryService(date) {
    return new Promise((resolve) => {
        // Create a copy of the date to avoid modifying the input
        const startTime = new Date(date);
        const endTime = new Date(date);
        
        // Set to UTC midnight and end of day
        startTime.setUTCHours(0, 0, 0, 0);
        endTime.setUTCHours(23, 59, 59, 999);
        
        console.log('🔍 Browser History Date Range:', {
            requestedDate: date.toISOString(),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            startTimestamp: startTime.getTime(),
            endTimestamp: endTime.getTime()
        });
        
        chrome.history.search({
            text: '',
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            maxResults: 100
        }, function(historyItems) {
            // Log the timestamps of returned items
            if (historyItems?.length > 0) {
                console.log('📊 Browser History Items:', historyItems.map(item => ({
                    title: item.title,
                    timestamp: item.lastVisitTime,
                    date: new Date(item.lastVisitTime).toISOString()
                })));
            }
            
            // Filter items to only include those from the requested date
            const filteredItems = historyItems.filter(item => {
                const itemDate = new Date(item.lastVisitTime);
                return itemDate.getUTCFullYear() === date.getUTCFullYear() &&
                       itemDate.getUTCMonth() === date.getUTCMonth() &&
                       itemDate.getUTCDate() === date.getUTCDate();
            });
            
            console.log('📊 Filtered Browser History Items:', {
                totalItems: historyItems.length,
                filteredItems: filteredItems.length,
                items: filteredItems.map(item => ({
                    title: item.title,
                    timestamp: item.lastVisitTime,
                    date: new Date(item.lastVisitTime).toISOString()
                }))
            });
            
            resolve(filteredItems);
        });
    });
}

export function shouldFilterUrl(url) {
  try {
    const parsedUrl = new URL(url);
    
    // Filter search queries
    if (parsedUrl.pathname.includes('/search') || 
        parsedUrl.pathname.includes('/s') ||
        parsedUrl.search.includes('?q=') ||
        parsedUrl.search.includes('?query=')) {
      return true;
    }

    // Filter autocomplete and suggestion URLs
    if (parsedUrl.pathname.includes('/complete/search') ||
        parsedUrl.pathname.includes('/suggest') ||
        parsedUrl.pathname.includes('/autocomplete')) {
      return true;
    }

    // Filter tracking and ad URLs
    if (parsedUrl.hostname.includes('ads.') ||
        parsedUrl.hostname.includes('analytics.') ||
        parsedUrl.hostname.includes('tracker.') ||
        parsedUrl.hostname.includes('pixel.') ||
        parsedUrl.pathname.includes('/ads/') ||
        parsedUrl.pathname.includes('/tracking/')) {
      return true;
    }

    // Filter specific domains we don't want to track
    const filteredDomains = [
      'google.com/search',
      'mail.google.com/mail',
      'google.com/complete',
      'bing.com/search',
      'yahoo.com/search',
      'google.com/url',  // Google redirect URLs
      'doubleclick.net',
      'googleadservices.com'
    ];

    if (filteredDomains.some(domain => parsedUrl.href.includes(domain))) {
      return true;
    }

    return false;
  } catch {
    return true; // Filter invalid URLs
  }
}