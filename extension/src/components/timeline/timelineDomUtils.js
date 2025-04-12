import { getEventDetails } from './timelineEventDetails.js';
import { getEventCategory } from './timelineEventProcessor.js';

export function createEventElements(events) {
    const fragment = document.createDocumentFragment();
    const FIXED_SPACE = 200; // Fixed space between events in pixels

    // Sort events by timestamp in ascending order (oldest to newest)
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate total width needed (number of gaps * fixed space)
    const totalWidth = (sortedEvents.length - 1) * FIXED_SPACE;
    
    sortedEvents.forEach((event, index) => {
        const eventDiv = document.createElement('div');
        eventDiv.className = `timeline-event ${index % 2 === 0 ? 'above' : 'below'}`;

        // Position from right: most recent event at right edge (100%),
        // others spaced FIXED_SPACE pixels to the left
        const rightOffset = (sortedEvents.length - 1 - index) * FIXED_SPACE;
        eventDiv.style.right = `${rightOffset}px`;
        // Use absolute positioning from right instead of left
        eventDiv.style.left = 'auto';

        const timeText = new Date(Number(event.timestamp)).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        const eventDetails = getEventDetails(event);
        eventDiv.innerHTML = createEventPopupContent(eventDetails, timeText);
        eventDiv.setAttribute('data-category', getEventCategory(event));

        attachEventListeners(eventDiv, eventDetails);
        fragment.appendChild(eventDiv);
    });

    // Set the timeline width to accommodate all events
    const timelineEvents = document.getElementById('timeline-events');
    const timelineLine = document.querySelector('.timeline-line');
    if (timelineEvents && timelineLine) {
        timelineEvents.style.width = `${totalWidth}px`;
        timelineLine.style.width = `${totalWidth}px`;
    }

    return fragment;
}

export function createEventPopupContent(eventDetails, timeText) {
    return `
        <div class="timeline-dot"></div>
        <div class="event-popup">
            <div class="date">
                ${eventDetails.title}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${timeText}
            </div>
            ${eventDetails.details.map(detail => {
                const labelClass = detail.label.toLowerCase().replace(/\s+/g, '-') + '-label';
                const valueClass = detail.label.toLowerCase().replace(/\s+/g, '-') + '-value';
                return `
                    <div class="detail-item">
                        <span class="detail-label ${labelClass}">${detail.label}:</span>
                        ${detail.isLink 
                            ? `<a href="${detail.url}" class="detail-value link ${valueClass}" target="_blank">${detail.value.replace(/^https?:\/\//, '')}</a>`
                            : detail.role === 'heading'
                                ? `<span class="detail-value heading ${valueClass}" role="heading">${detail.value}</span>`
                                : `<span class="detail-value ${valueClass}">${detail.value}</span>`
                        }
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

export function addNowMarker(timelineEvents) {
    const nowMarker = document.createElement('div');
    nowMarker.className = 'timeline-now-marker';
    nowMarker.style.left = '100%';
    nowMarker.innerHTML = '<div class="now-text">NOW</div>';
    timelineEvents.appendChild(nowMarker);
}

export function attachEventListeners(eventDiv, eventDetails) {
    const actionButtons = eventDiv.querySelectorAll('.action-button');
    actionButtons.forEach((button, index) => {
        const action = eventDetails.actions[index];
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (action.onClick) {
                action.onClick(e);
            } else if (action.url) {
                window.open(action.url, '_blank');
            }
        });
    });
}
