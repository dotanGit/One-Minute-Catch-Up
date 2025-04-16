import { processAllEvents } from './timelineEventProcessor.js';
import { createEventElements } from './timelineDomUtils.js';
import { addNowMarker } from './timelineDomUtils.js';

let lastLeftmostPositionIsAbove = true; // default assumption

function updateTimeline(history, drive, emails, calendar, downloads, mode = 'rebuild') {
    const timelineEvents = document.getElementById('timeline-events');
    const timelineLine = document.querySelector('.timeline-line');
    const container = document.querySelector('.timeline-container');
    if (!timelineEvents || !timelineLine || !container) return;

    const processedEvents = processAllEvents(history, drive, emails, calendar, downloads);
    processedEvents.sort((a, b) => a.timestamp - b.timestamp);

    const FIXED_SPACE = 200;

    if (mode === 'rebuild') {
        timelineEvents.innerHTML = '';
        const totalWidth = Math.max(1300, processedEvents.length * FIXED_SPACE);
        timelineEvents.style.width = `${totalWidth}px`;
        timelineLine.style.width = `${totalWidth}px`;
        
        const fragment = createEventElements(processedEvents);
        timelineEvents.appendChild(fragment);
        addNowMarker(timelineEvents);
        
        container.scrollLeft = container.scrollWidth;
    } else if (mode === 'prepend') {
        // Get existing events count first
        const existingEvents = timelineEvents.querySelectorAll('.timeline-event');
        const existingEventsCount = existingEvents.length;
        
        const currentWidth = existingEventsCount * FIXED_SPACE;
        const additionalWidth = processedEvents.length * FIXED_SPACE;
        const newWidth = currentWidth + additionalWidth;

        timelineEvents.style.width = `${newWidth}px`;
        timelineLine.style.width = `${newWidth}px`;

        // ✅ Step 1: Decide based on total number of events (clean and stable)
        const newEventsCount = processedEvents.length;
        const totalEvents = existingEventsCount + newEventsCount;

        let startWithAbove = totalEvents % 2 === 0;

        console.log(`🟢 Total events calculation: existing=${existingEventsCount}, new=${newEventsCount}, total=${totalEvents}, startWithAbove=${startWithAbove}`);

        const fragment = createEventElements(processedEvents, 'prepend', newWidth, startWithAbove);
        timelineEvents.prepend(fragment);

        container.scrollLeft += additionalWidth;

        console.log(`Prepended ${processedEvents.length} events and adjusted width to ${newWidth}px`);
    }
}

export function buildTimeline(history, drive, emails, calendar, downloads) {
    updateTimeline(history, drive, emails, calendar, downloads, 'rebuild');
}

export function prependTimeline(history, drive, emails, calendar, downloads) {
    updateTimeline(history, drive, emails, calendar, downloads, 'prepend');
    }

