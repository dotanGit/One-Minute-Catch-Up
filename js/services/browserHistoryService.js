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