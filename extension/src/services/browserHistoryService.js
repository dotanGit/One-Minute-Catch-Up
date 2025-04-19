import { normalizeDateToStartOfDay } from '../utils/dateUtils.js';
import { badWords } from './badWordsFilter.js';

// getBrowserHistoryService.js

export async function getBrowserHistoryService(date) {
  // 🔄 Use local day boundaries
  const start = normalizeDateToStartOfDay(date);
  const end = new Date(start.getTime() + 86400000); // +1 local day

  console.log('[DEBUG] Fetching browser history for date window:');
  console.log('→ Start (local):', start.toString());
  console.log('→ End (local):', end.toString());

  const historyItems = await chrome.history.search({
    text: '',
    startTime: start.getTime(),
    endTime: end.getTime(),
    maxResults: 500
  });

  console.log('[DEBUG] history.search() returned:', historyItems.length, 'items');
  console.log('[DEBUG] Sample URLs:', historyItems.slice(0, 3).map(i => i.url));

  const events = [];

  for (const item of historyItems) {
    const visits = await new Promise((resolve) =>
      chrome.history.getVisits({ url: item.url }, resolve)
    );

    for (const visit of visits) {
      const visitTime = visit.visitTime;
      if (visitTime >= start.getTime() && visitTime < end.getTime()) {
        console.log(`[DEBUG] Added visit → ${item.url}`);
        console.log(`   visitTime (ms): ${visitTime}`);
        console.log(`   visitTime ISO : ${new Date(visitTime).toISOString()}`);

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

    if (badWords.some(word => fullUrl.includes(word))) return true;

    const searchIndicators = ['/search', '/s', '/suggest', '/autocomplete', '/complete/search'];
    if (searchIndicators.some(part => parsedUrl.pathname.includes(part))) return true;

    const queryIndicators = ['?q=', '?query='];
    if (queryIndicators.some(part => parsedUrl.search.includes(part))) return true;

    const adIndicators = ['ads.', 'analytics.', 'tracker.', 'pixel.'];
    if (adIndicators.some(part => parsedUrl.hostname.includes(part))) return true;

    const adPaths = ['/ads/', '/tracking/'];
    if (adPaths.some(part => parsedUrl.pathname.includes(part))) return true;

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
    if (filteredDomains.some(domain => parsedUrl.href.includes(domain))) return true;

    return false;
  } catch {
    return true;
  }
}
