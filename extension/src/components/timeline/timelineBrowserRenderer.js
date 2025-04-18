export function processHistoryEvent(item, currentTime, processedEvents) {
    if (item.url.startsWith('chrome://downloads')) return;
    processedEvents.push({
      type: 'browser',
      timestamp: currentTime,
      title: 'Browser Visit',
      actualTitle: item.title,
      description: item.url,
      url: item.url,
      duration: 0,
      id: item.id
    });
  }
  