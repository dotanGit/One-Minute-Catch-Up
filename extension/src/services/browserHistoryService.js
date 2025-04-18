import { normalizeDateToStartOfDay, safeGetTimestamp } from '../utils/dateUtils.js';
import { badWords } from './badWordsFilter.js';

export function getBrowserHistoryService(date) {
    return new Promise((resolve) => {
        const startTime = normalizeDateToStartOfDay(date);
        const endTime = new Date(startTime);
        endTime.setUTCHours(23, 59, 59, 999);

        chrome.history.search({
            text: '',
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            maxResults: 100
        }, function(historyItems) {
            const filteredItems = historyItems.filter(item => {
                const ts = safeGetTimestamp(item.lastVisitTime);
                return ts >= startTime.getTime() && ts <= endTime.getTime();
            });

            resolve(filteredItems);
        });
    });
}


export function shouldFilterUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const fullUrl = parsedUrl.href.toLowerCase();

    // Filter based on badWords list
    if (badWords.some(word => fullUrl.includes(word))) {
      return true;
    }
    
    // Filter search queries and autocomplete
    const searchIndicators = ['/search', '/s', '/suggest', '/autocomplete', '/complete/search'];
    if (searchIndicators.some(part => parsedUrl.pathname.includes(part))) {
      return true;
    }

    // Filter query parameters
    const queryIndicators = ['?q=', '?query='];
    if (queryIndicators.some(part => parsedUrl.search.includes(part))) {
      return true;
    }

    // Filter tracking/ad-related hostnames or paths
    const adIndicators = ['ads.', 'analytics.', 'tracker.', 'pixel.'];
    if (adIndicators.some(part => parsedUrl.hostname.includes(part))) {
      return true;
    }

    const adPaths = ['/ads/', '/tracking/'];
    if (adPaths.some(part => parsedUrl.pathname.includes(part))) {
      return true;
    }

    // Filter specific known domains
    const filteredDomains = [
      'google.com/search',
      'mail.google.com/mail',
      'google.com/complete',
      'bing.com/search',
      'yahoo.com/search',
      'google.com/url',
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