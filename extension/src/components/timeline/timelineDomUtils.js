import { getEventDetails } from './timelineEventDetails.js';
import { getEventCategory } from './timelineEventProcessor.js';
import { initTimeline } from './timeline.js';

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
        eventDiv.setAttribute('data-event-id', event.id);

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
        eventDiv.innerHTML = `
            <div class="timeline-dot">
                <button class="close-button" title="Hide this event">×</button>
                <button class="mark-button" title="Mark this event">✓</button>
            </div>
            <div class="event-popup">
                <div class="date">
                    ${eventDetails.title}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;${timeText}
                </div>
                ${eventDetails.details.map((detail, index) => {
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
        if (getEventCategory(event) === 'browser') {
            const timelineDot = eventDiv.querySelector('.timeline-dot');
            const eventDetailsWebsite = eventDetails.details.find(d => d.label.toLowerCase() === 'website');
            if (eventDetailsWebsite && eventDetailsWebsite.value) {
                const url = new URL(eventDetailsWebsite.value.startsWith('http') ? eventDetailsWebsite.value : 'https://' + eventDetailsWebsite.value);
                timelineDot.style.setProperty('--favicon-url', `url('https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32')`);
            }
        }
        eventDiv.setAttribute('data-category', getEventCategory(event));

        attachEventListeners(eventDiv, eventDetails);
        fragment.appendChild(eventDiv);
    });

    return fragment;
}

export function createEventPopupContent(eventDetails, timeText) {
    // Use the timestamp from the original event object
    const eventDate = timeText.split(',')[0]; // Extract just the date part
    return `
        <div class="timeline-dot">
            <button class="close-button" title="Hide this event">×</button>
            <button class="mark-button" title="Mark this event">✓</button>
        </div>
        <div class="event-popup">
            <div class="date">
                ${eventDetails.title}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;${timeText}
            </div>
            ${eventDetails.details.map((detail, index) => {
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


export function attachEventListeners(eventDiv, eventDetails) {
    // Handle close button click
    const closeButton = eventDiv.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const eventId = eventDiv.getAttribute('data-event-id');
            chrome.storage.local.get(['hiddenEventIds'], (result) => {
                const hiddenIds = new Set(result.hiddenEventIds || []);
                hiddenIds.add(String(eventId));
                chrome.storage.local.set({ hiddenEventIds: Array.from(hiddenIds) }, () => {
                    console.log('Hidden IDs in cache:', Array.from(hiddenIds));
                    // Remove the event from the DOM
                    eventDiv.remove();
                    // Rebuild the timeline
                    initTimeline();
                });
            });
        });
    }

    // Handle mark button click
    const markButton = eventDiv.querySelector('.mark-button');
    if (markButton) {
        markButton.addEventListener('click', (e) => {
            e.stopPropagation();
            eventDiv.classList.toggle('marked');
            updateDeleteMarkedButtonVisibility();
        });
    }

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
            const link = eventDiv.querySelector(`.detail-value.link[data-detail-index="${index}"]`);
            if (link) {
                link.addEventListener('click', detail.onClick);
            }
        }
    });
}

export function deleteMarkedEvents() {
    const markedEvents = document.querySelectorAll('.timeline-event.marked');
    const eventIds = Array.from(markedEvents).map(event => event.getAttribute('data-event-id'));
    
    if (eventIds.length > 0) {
        chrome.storage.local.get(['hiddenEventIds'], (result) => {
            const hiddenIds = new Set(result.hiddenEventIds || []);
            eventIds.forEach(id => hiddenIds.add(id));
            chrome.storage.local.set({ hiddenEventIds: Array.from(hiddenIds) }, () => {
                console.log('Hidden IDs in cache:', Array.from(hiddenIds));
                // Remove all marked events from the DOM
                markedEvents.forEach(event => event.remove());
                // Rebuild the timeline
                initTimeline();
            });
        });
    }
}

function updateDeleteMarkedButtonVisibility() {
    let deleteButton = document.querySelector('.delete-marked-button');
    let clearButton = document.querySelector('.clear-marked-button');
  
    // Create Delete button if missing
    if (!deleteButton) {
      deleteButton = document.createElement('button');
      deleteButton.className = 'delete-marked-button';
      deleteButton.addEventListener('click', deleteMarkedEvents);
      document.body.appendChild(deleteButton);
    }
  
    // Create Clear button if missing
    if (!clearButton) {
      clearButton = document.createElement('button');
      clearButton.className = 'clear-marked-button';
      clearButton.addEventListener('click', () => {
        document.querySelectorAll('.timeline-event.marked')
          .forEach(el => el.classList.remove('marked'));
        updateDeleteMarkedButtonVisibility();
      });
      document.body.appendChild(clearButton);
    }
  
    // Show/hide both buttons based on marked items
    const markedEvents = document.querySelectorAll('.timeline-event.marked');
    const show = markedEvents.length > 0;
  
    deleteButton.classList.toggle('visible', show);
    clearButton.classList.toggle('visible', show);
  }
  
  

// Initialize the delete marked button
export function initDeleteMarkedButton() {
    updateDeleteMarkedButtonVisibility();
}

// Call this function after initTimeline is called
export function onTimelineInitialized() {
    initDeleteMarkedButton();
}
