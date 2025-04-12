import { getEventDetails } from './timelineEventDetails.js';
import { getEventCategory } from './timelineEventProcessor.js';

export function createEventElements(events, mode = 'append', currentTimelineWidth = 0, invertPosition = false) {
    const fragment = document.createDocumentFragment();
    const FIXED_SPACE = 200;

    // Get existing events to know where to position new ones
    const timelineEvents = document.getElementById('timeline-events');
    const existingEvents = timelineEvents ? timelineEvents.querySelectorAll('.timeline-event') : [];
    
    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => {
        // For prepending, we want oldest to newest (left to right)
        if (mode === 'prepend') {
            return a.timestamp - b.timestamp;
        }
        // For initial load/append, we want newest to oldest (right to left)
        return b.timestamp - a.timestamp;
    });

    sortedEvents.forEach((event, index) => {
        const eventDiv = document.createElement('div');
        const positionClass = (index % 2 === 0)
            ? (invertPosition ? 'below' : 'above')
            : (invertPosition ? 'above' : 'below');

        eventDiv.className = `timeline-event ${positionClass}`;

        let position;
        if (mode === 'prepend') {
            position = currentTimelineWidth - ((index + 1) * FIXED_SPACE);
        } else {
            position = index * FIXED_SPACE;
        }

        eventDiv.style.right = `${position}px`;
        eventDiv.style.left = 'auto';
        eventDiv.style.position = 'absolute';

        const timeText = new Date(Number(event.timestamp))
            .toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            .replace(',', ',&nbsp;');

        const eventDetails = getEventDetails(event);
        eventDiv.innerHTML = createEventPopupContent(eventDetails, timeText);
        eventDiv.setAttribute('data-category', getEventCategory(event));

        attachEventListeners(eventDiv, eventDetails);
        fragment.appendChild(eventDiv);
    });

    return fragment;
}

export function createEventPopupContent(eventDetails, timeText) {
    console.log('Creating event popup content:', eventDetails);
    // Use the timestamp from the original event object
    const eventDate = timeText.split(',')[0]; // Extract just the date part
    return `
        <div class="timeline-dot"></div>
        <div class="event-popup">
            <div class="date">
                ${eventDetails.title}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;${timeText}
            </div>
            ${eventDetails.details.map((detail, index) => {
                console.log('Processing detail:', detail);
                const labelClass = detail.label.toLowerCase().replace(/\s+/g, '-') + '-label';
                const valueClass = detail.label.toLowerCase().replace(/\s+/g, '-') + '-value';
                return `
                    <div class="detail-item">
                        <span class="detail-label ${labelClass}">${detail.label}:</span>
                        ${detail.isLink 
                            ? detail.onClick
                                ? `<a href="#" class="detail-value link ${valueClass}" data-has-click-handler="true" data-detail-index="${index}">${detail.value}</a>`
                                : `<a href="${detail.url}" class="detail-value link ${valueClass}" target="_blank">${detail.value.replace(/^https?:\/\//, '')}</a>`
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
    console.log('Attaching event listeners:', { eventDiv, eventDetails });
    // Handle action buttons
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

    // Handle links with click handlers
    eventDetails.details.forEach((detail, index) => {
        if (detail.isLink && detail.onClick) {
            console.log('Looking for link with click handler:', index);
            const link = eventDiv.querySelector(`.detail-value.link[data-detail-index="${index}"]`);
            console.log('Found link element:', link);
            if (link) {
                console.log('Attaching click handler to link');
                link.addEventListener('click', detail.onClick);
            }
        }
    });
}
