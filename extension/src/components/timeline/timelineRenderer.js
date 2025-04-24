import { processAllEvents } from './timelineEventProcessor.js';
import { createEventElements } from './timelineDomUtils.js';

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
