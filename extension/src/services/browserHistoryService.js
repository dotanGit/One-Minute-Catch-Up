import { normalizeDateToStartOfDay, safeGetTimestamp } from '../utils/dateUtils.js';
import { badWords } from './badWordsFilter.js';

// getBrowserHistoryService.js

export async function getBrowserHistoryService(date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);

  const historyItems = await chrome.history.search({
    text: '',
    startTime: start.getTime(),
    endTime: end.getTime(),
    maxResults: 500
  });

  const events = [];

  for (const item of historyItems) {
    const visits = await new Promise((resolve) =>
      chrome.history.getVisits({ url: item.url }, resolve)
    );

    for (const visit of visits) {
      const visitTime = visit.visitTime;
      if (visitTime >= start.getTime() && visitTime < end.getTime()) {
        events.push({
          id: `${item.id}-${visit.visitId}`,
          url: item.url,
          title: item.title,
          lastVisitTime: visitTime,
          timestamp: visitTime
        });
      }
    }
  }

  return events;
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