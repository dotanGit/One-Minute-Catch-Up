import { processAllEvents,getEventCategory } from './timelineEventProcessor.js';
import { getEventDetails } from './timelineEventDetails.js';
import { attachEventListeners } from './timelineDomUtils.js';
import { saveFirst6EventsHTML } from './cache.js';

export async function buildTimeline(history, drive, emails, calendar, downloads) {
  const timelineEvents = document.getElementById('timeline-events');
  const timelineLine = document.querySelector('.timeline-line');
  const container = document.querySelector('.timeline-container');
  if (!timelineEvents || !timelineLine || !container) return;

  const processedEvents = processAllEvents(history, drive, emails, calendar, downloads);

  const FIXED_SPACE = 200;

  timelineEvents.innerHTML = '';
  const totalWidth = Math.max(1300, processedEvents.length * FIXED_SPACE);
  timelineEvents.style.width = `${totalWidth}px`;
  timelineLine.style.width = `${totalWidth}px`;

  const fragment = createEventElements(processedEvents);
  timelineEvents.appendChild(fragment);

  const newRealWidth = timelineEvents.scrollWidth;
  timelineEvents.style.width = `${newRealWidth}px`;
  timelineLine.style.width = `${newRealWidth}px`;

  // === NEW: Save First 6 Events HTML ===
  const first6Nodes = Array.from(timelineEvents.querySelectorAll('.timeline-event')).slice(0, 6);
  console.log('=== First 6 Events Being Cached ===');
  const tempDiv = document.createElement('div');
  first6Nodes.forEach(node => tempDiv.appendChild(node.cloneNode(true)));
  const htmlString = tempDiv.innerHTML;

  await saveFirst6EventsHTML(htmlString);
  console.log('[TIMELINE] 💾 Saved first 6 events HTML after build');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (container) container.scrollLeft = container.scrollWidth;
    });
  });
}

export function createEventElements(events, invertPosition = false) {
  const fragment = document.createDocumentFragment();
  const FIXED_SPACE = 200;
  const template = document.getElementById('event-template');

  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  sortedEvents.forEach((event, index) => {
    const clone = template.content.cloneNode(true);
    const eventDiv = clone.querySelector('.timeline-event');

    const category = getEventCategory(event);
    const positionClass = (index % 2 === 0)
      ? (invertPosition ? 'below' : 'above')
      : (invertPosition ? 'above' : 'below');

    eventDiv.classList.remove('above', 'below');
    eventDiv.classList.add(positionClass);
    eventDiv.setAttribute('data-event-id', event.id);
    eventDiv.setAttribute('data-category', category);
    eventDiv.style.right = `${(index * FIXED_SPACE)+110}px`;

    const timeText = new Date(Number(event.timestamp)).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', ',\u00a0');

    const eventDetails = getEventDetails(event);
    const dateDiv = eventDiv.querySelector('.date');
    dateDiv.innerHTML = `${eventDetails.title}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;${timeText}`;

    const detailsContainer = eventDiv.querySelector('.details-container');
    eventDetails.details.forEach((detail) => {
      const item = document.createElement('div');
      item.className = 'detail-item';

      let valueNode;
      if (detail.isLink) {
        const a = document.createElement('a');
        a.className = 'detail-value link';
        a.textContent = detail.value;

        if (detail.onClick) {
          a.href = '#';
          a.onclick = detail.onClick;
        } else {
          a.href = detail.url;
          a.target = '_blank';
        }
        valueNode = a;
      } else {
        const span = document.createElement('span');
        span.className = 'detail-value';
        span.textContent = detail.value;
        valueNode = span;
      }

      item.appendChild(valueNode);
      detailsContainer.appendChild(item);
    });

    // Handle favicon for browser events
    if (category === 'browser') {
      const dot = eventDiv.querySelector('.timeline-dot');
      if (event.url) {
        try {
          const url = new URL(event.url.startsWith('http') ? event.url : 'https://' + event.url);
          dot.style.setProperty('--favicon-url', `url('https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32')`);
        } catch (err) {
          console.warn('Invalid URL for favicon:', event.url);
        }
      }
    }

    attachEventListeners(eventDiv, eventDetails);
    fragment.appendChild(clone);
  });

  return fragment;
}