import { processAllEvents,getEventCategory } from './timelineEventProcessor.js';
import { getEventDetails } from './timelineEventDetails.js';
import { attachEventListeners } from './timelineDomUtils.js';

export function buildTimeline(history, drive, emails, calendar, downloads) {
  const timelineEvents = document.getElementById('timeline-events');
  const timelineLine = document.querySelector('.timeline-line');
  const container = document.querySelector('.timeline-container');
  if (!timelineEvents || !timelineLine || !container) return;

  const processedEvents = processAllEvents(history, drive, emails, calendar, downloads);
  processedEvents.sort((a, b) => a.timestamp - b.timestamp);

  const FIXED_SPACE = 200;

  timelineEvents.innerHTML = '';
  const totalWidth = Math.max(1300, processedEvents.length * FIXED_SPACE);
  timelineEvents.style.width = `${totalWidth}px`;
  timelineLine.style.width = `${totalWidth}px`;

  const fragment = createEventElements(processedEvents);

  timelineEvents.appendChild(fragment);

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
    eventDiv.style.right = `${index * FIXED_SPACE}px`;

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
    eventDetails.details.forEach((detail, i) => {
      const item = document.createElement('div');
      item.className = 'detail-item';

      const label = document.createElement('span');
      const labelClass = detail.label.toLowerCase().replace(/\s+/g, '-') + '-label';
      label.className = `detail-label ${labelClass}`;
      label.textContent = `${detail.label}:`;

      const valueClass = detail.label.toLowerCase().replace(/\s+/g, '-') + '-value';
      let valueNode;

      if (detail.isLink) {
        const a = document.createElement('a');
        a.className = `detail-value link ${valueClass}`;
        a.textContent = detail.value.replace(/^https?:\/\//, '');

        if (detail.onClick) {
          a.href = '#';
          a.dataset.hasClickHandler = 'true';
          a.dataset.detailIndex = i;
        } else {
          a.href = detail.url;
          a.target = '_blank';
        }
        valueNode = a;
      } else {
        const span = document.createElement('span');
        span.className = `detail-value ${valueClass}`;
        if (detail.role === 'heading') {
          span.classList.add('heading');
          span.setAttribute('role', 'heading');
        }
        span.textContent = detail.value;
        valueNode = span;
      }

      item.appendChild(label);
      item.appendChild(valueNode);
      detailsContainer.appendChild(item);
    });

    if (category === 'browser') {
      const dot = eventDiv.querySelector('.timeline-dot');
      const websiteDetail = eventDetails.details.find(d => d.label.toLowerCase() === 'website');
      if (websiteDetail?.value) {
        try {
          const url = new URL(websiteDetail.value.startsWith('http') ? websiteDetail.value : 'https://' + websiteDetail.value);
          dot.style.setProperty('--favicon-url', `url('https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32')`);
        } catch (err) {
          console.warn('Invalid URL for favicon:', websiteDetail.value);
        }
      }
    }

    attachEventListeners(eventDiv, eventDetails);
    fragment.appendChild(clone);
  });

  return fragment;
}