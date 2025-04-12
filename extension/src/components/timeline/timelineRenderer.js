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
        // Initial load with first 10 events
        timelineEvents.innerHTML = '';
        const totalWidth = processedEvents.length * FIXED_SPACE;
        timelineEvents.style.width = `${totalWidth}px`;
        timelineLine.style.width = `${totalWidth}px`;
        
        const fragment = createEventElements(processedEvents);
        timelineEvents.appendChild(fragment);
        addNowMarker(timelineEvents);
        
        container.scrollLeft = container.scrollWidth;
    } else if (mode === 'prepend') {
        const currentWidth = timelineEvents.offsetWidth;
        const additionalWidth = processedEvents.length * FIXED_SPACE;
        const newWidth = currentWidth + additionalWidth;
        
        // Update the container width BEFORE creating events
        timelineEvents.style.width = `${newWidth}px`;
        timelineLine.style.width = `${newWidth}px`;
        

        const isLeftmostAbove = lastLeftmostPositionIsAbove;

        // Pass the newWidth to createEventElements
        const fragment = createEventElements(processedEvents, 'prepend', newWidth, isLeftmostAbove);
        timelineEvents.prepend(fragment);
        
        const events = timelineEvents.querySelectorAll('.timeline-event');
        let leftmostEvent = null;
        let maxRight = -Infinity;

        events.forEach(event => {
            const right = parseFloat(event.style.right);
            if (right > maxRight) {
                maxRight = right;
                leftmostEvent = event;
            }
        });

        if (leftmostEvent) {
            lastLeftmostPositionIsAbove = leftmostEvent.classList.contains('above');
        }
    
        // Adjust scroll position to prevent visual jump
        const container = document.querySelector('.timeline-container');
        if (container) {
            container.scrollLeft += additionalWidth;
        }
    
        console.log(`Prepended ${processedEvents.length} events and adjusted width to ${newWidth}px`);
    }
}

export function buildTimeline(history, drive, emails, calendar, downloads) {
    updateTimeline(history, drive, emails, calendar, downloads, 'rebuild');
}

export function prependTimeline(history, drive, emails, calendar, downloads) {
    updateTimeline(history, drive, emails, calendar, downloads, 'prepend');
    }

