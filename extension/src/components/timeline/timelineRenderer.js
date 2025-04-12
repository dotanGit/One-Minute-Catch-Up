import { processAllEvents } from './timelineEventProcessor.js';
import { createEventElements } from './timelineDomUtils.js';
import { addNowMarker } from './timelineDomUtils.js';

function updateTimeline(history, drive, emails, calendar, mode = 'rebuild') {
    const timelineEvents = document.getElementById('timeline-events');
    const timelineLine = document.querySelector('.timeline-line');
    if (!timelineEvents || !timelineLine) return;

    const processedEvents = processAllEvents(history, drive, emails, calendar);

    if (mode === 'rebuild') {
        timelineEvents.innerHTML = '';
        const now = Date.now();
        const timeSpanInHours = (now - window.globalStartTime) / (1000 * 60 * 60);
        const widthInPixels = timeSpanInHours * 50;
        
        timelineEvents.style.width = `${widthInPixels}px`;
        timelineLine.style.width = `${widthInPixels}px`;
    }

    const fragment = createEventElements(processedEvents);

    if (mode === 'prepend') {
        timelineEvents.prepend(fragment);
        const container = document.querySelector('.timeline-container');
        if (container) {
            container.scrollLeft += fragment.scrollWidth;
        }
    } else {
        timelineEvents.appendChild(fragment);
        addNowMarker(timelineEvents);
    }
}

export function buildTimeline(history, drive, emails, calendar) {
    updateTimeline(history, drive, emails, calendar, 'rebuild');
}

export function prependTimeline(history, drive, emails, calendar) {
    updateTimeline(history, drive, emails, calendar, 'prepend');
}

