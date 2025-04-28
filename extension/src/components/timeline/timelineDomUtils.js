import { initTimeline } from './timeline.js';
import { initTimelineFilterUI } from './timelineFilters.js';

export function attachEventListeners(eventDiv, eventDetails) {
    // Handle close button click
    const closeButton = eventDiv.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const eventId = eventDiv.getAttribute('data-event-id');
            chrome.storage.local.get(['hiddenEventIds'], (result) => {
                const hiddenIds = new Set(result.hiddenEventIds || []);
                hiddenIds.add(String(eventId));
                chrome.storage.local.set({ hiddenEventIds: Array.from(hiddenIds) }, async () => {
                    console.log('Hidden IDs in cache:', Array.from(hiddenIds));
                    // Remove the event from the DOM
                    eventDiv.remove();
                    // Update delete button visibility
                    updateDeleteMarkedButtonVisibility();
                    // Rebuild the timeline and reinitialize filters
                    await initTimeline();
                    await initTimelineFilterUI(() => initTimeline());
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
            chrome.storage.local.set({ hiddenEventIds: Array.from(hiddenIds) }, async () => {
                console.log('Hidden IDs in cache:', Array.from(hiddenIds));
                // Remove all marked events from the DOM
                markedEvents.forEach(event => event.remove());
                // Hide the delete and clear buttons
                updateDeleteMarkedButtonVisibility();
                // Rebuild the timeline and reinitialize filters
                await initTimeline();
                await initTimelineFilterUI(() => initTimeline());
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

    // If no marked events, consider removing the buttons from DOM
    if (!show) {
        deleteButton.remove();
        clearButton.remove();
    }
}
  
  

// Initialize the delete marked button
export function initDeleteMarkedButton() {
    updateDeleteMarkedButtonVisibility();
}

// Call this function after initTimeline is called
export function onTimelineInitialized() {
    initDeleteMarkedButton();
}
