    import { safeGetTimestamp } from '../utils/dateUtils.js';
    import { shouldFilterUrl } from '../services/browserHistoryService.js';
    import { currentDate } from '../dashboard/timeline.js';

    function formatTimeRange(startHour, endHour) {
        const formatHour = (hour) => {
            hour = hour % 24;
            return `${hour.toString().padStart(2, '0')}:00`;
        };
        return `${formatHour(startHour)} - ${formatHour(endHour)}`;
    }

    function updateTimePeriodDisplay() {
        const periodElement = document.getElementById('time-period');
        if (!periodElement) return;

        const zoomConfig = ZOOM_LEVELS[currentZoomLevel];
        const hoursPerPeriod = zoomConfig.hours;
        const startHour = 0;
        const endHour = hoursPerPeriod;
        
        periodElement.textContent = formatTimeRange(startHour, endHour);
    }

    function getCurrentTimeRange() {
        // Use the selected date instead of today
        const selectedDate = new Date(currentDate);
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        
        return { start, end };
    }

    function isEventInCurrentPeriod(timestamp) {
        const { start, end } = getCurrentTimeRange();
        const eventTime = new Date(Number(timestamp));
        return eventTime >= start && eventTime < end;
    }

    function initializeTimePeriodControls(history, drive, emails, calendar) {
        const prevButton = document.getElementById('prev-period');
        const nextButton = document.getElementById('next-period');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                const zoomConfig = ZOOM_LEVELS[currentZoomLevel];
                rebuildTimeline(history, drive, emails, calendar);
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const zoomConfig = ZOOM_LEVELS[currentZoomLevel];
                rebuildTimeline(history, drive, emails, calendar);
            });
        }
    }


    export function prependTimeline(history, drive, emails, calendar) {
        const timelineEvents = document.getElementById('timeline-events');
        const timelineLine = document.querySelector('.timeline-line');
        if (!timelineEvents || !timelineLine) return;

        const processedEvents = [];

        // Process history, drive, emails, calendar — same logic as rebuildTimeline
        // History
        if (history && history.length > 0) {
            const sortedHistory = history.sort((a, b) => a.lastVisitTime - b.lastVisitTime);
            const sessions = {};
            const SESSION_TIMEOUT = 60 * 60 * 1000;

            sortedHistory.forEach(item => {
                if (!item.lastVisitTime || !item.url) return;
                if (shouldFilterUrl(item.url)) return;

                const pattern = extractPattern(item.url);
                const currentTime = item.lastVisitTime;

                if (!sessions[pattern]) {
                    sessions[pattern] = { start: currentTime, end: currentTime };
                    processedEvents.push({
                        type: 'browser',
                        timestamp: currentTime,
                        title: item.title || 'Website Visit',
                        description: simplifyUrl(item.url),
                        url: item.url,
                        duration: 0
                    });
                    return;
                }

                const session = sessions[pattern];
                const timeSinceLast = currentTime - session.end;

                if (timeSinceLast < SESSION_TIMEOUT) {
                    sessions[pattern].end = currentTime;
                    const duration = Math.floor((currentTime - session.start) / 60000);
                    const lastEvent = processedEvents.find(e => e.type === 'browser' && e.url === item.url);
                    if (lastEvent) {
                        lastEvent.duration = duration;
                    }
                } else {
                    sessions[pattern] = { start: currentTime, end: currentTime };
                    processedEvents.push({
                        type: 'browser',
                        timestamp: currentTime,
                        title: item.title || 'Website Visit',
                        description: simplifyUrl(item.url),
                        url: item.url,
                        duration: 0
                    });
                }
            });
        }

        // Drive
        if (drive && drive.files && drive.files.length > 0) {
            drive.files.forEach(file => {
                if (file.modifiedTime) {
                    const timestamp = safeGetTimestamp(file.modifiedTime);
                    if (timestamp > 0) {
                        processedEvents.push({
                            type: 'drive',
                            timestamp: timestamp,
                            title: 'Drive File Edit',
                            description: file.name,
                            webViewLink: file.webViewLink,
                            changes: file.lastModifyingUser ? `Modified by ${file.lastModifyingUser.displayName}` : 'Modified'
                        });
                    }
                }
            });
        }

        // Emails
        if (emails && (emails.all || emails.sent || emails.received)) {
            const emailList = emails.all || [...(emails.sent || []), ...(emails.received || [])];
            emailList.forEach(email => {
                if (email.timestamp) {
                    processedEvents.push({
                        type: 'email',
                        timestamp: Number(email.timestamp),
                        title: email.type === 'sent' ? 'Email Sent' : 'Email Received',
                        description: email.type === 'sent' ? `To: ${email.to || 'No recipient'}` : `From: ${email.from || 'No sender'}`,
                        subject: email.subject || 'No subject',
                        from: email.from,
                        to: email.to,
                        emailUrl: email.threadId ? `https://mail.google.com/mail/u/0/#inbox/${email.threadId}` : null
                    });
                }
            });
        }

        // Calendar
        if (calendar && calendar.today && calendar.today.length > 0) {
            calendar.today.forEach(event => {
                const eventTime = event.start?.dateTime || event.start?.date;
                if (eventTime) {
                    const timestamp = safeGetTimestamp(eventTime);
                    if (timestamp > 0) {
                        processedEvents.push({
                            type: 'calendar',
                            timestamp: timestamp,
                            title: 'Calendar Event',
                            description: event.summary || 'Untitled event',
                            calendarName: event.calendarName,
                            location: event.location,
                            duration: event.end ? `${new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'All day',
                            eventUrl: event.htmlLink
                        });
                    }
                }
            });
        }

        // Sort events
        processedEvents.sort((a, b) => a.timestamp - b.timestamp);

        // Build elements
        const fragment = document.createDocumentFragment();

        processedEvents.forEach((event, index) => {
            const eventDiv = document.createElement('div');
            eventDiv.className = `timeline-event ${index % 2 === 0 ? 'above' : 'below'}`;

            const position = (index / (processedEvents.length - 1)) * 100;
            eventDiv.style.left = `${position}%`;


            const timeText = new Date(Number(event.timestamp)).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            const eventDetails = getEventDetails(event);
            const popupContent = `
                <div class="timeline-dot"></div>
                <div class="event-popup">
                    <div class="date">${eventDetails.title}</div>
                    <div class="title">${timeText}</div>
                    ${eventDetails.details.map(detail => `
                        <div class="detail-item">
                            <span class="detail-label">${detail.label}:</span>
                            ${detail.isLink 
                                ? `<a href="${detail.url}" class="detail-value link" target="_blank">${detail.value}</a>`
                                : `<span class="detail-value">${detail.value}</span>`
                            }
                        </div>
                    `).join('')}
                </div>
            `;

            eventDiv.innerHTML = popupContent;
            eventDiv.setAttribute('data-category', getEventCategory(event));

            // After setting innerHTML, add event listeners to all buttons
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

            fragment.appendChild(eventDiv);
        });

        // Prepend to timeline
        timelineEvents.prepend(fragment);

        // Adjust scroll to prevent jump
        const container = document.querySelector('.timeline-container');
        if (container) {
            container.scrollLeft += fragment.scrollWidth;
        }
    }





    // Define rebuildTimeline at the top level
    function rebuildTimeline(history, drive, emails, calendar) {
        const timelineEvents = document.getElementById('timeline-events');
        const timelineLine = document.querySelector('.timeline-line');
        if (!timelineEvents || !timelineLine) return;

        timelineEvents.innerHTML = '';
        const processedEvents = [];
        
        // Set fixed width for timeline
        const now = Date.now();
        const timeSpanInHours = (now - window.globalStartTime) / (1000 * 60 * 60);
        const widthInPixels = timeSpanInHours * 50; // adjust scale here
        
        timelineEvents.style.width = `${widthInPixels}px`;
        timelineLine.style.width = `${widthInPixels}px`;
        
        // Process browser history
        if (history && history.length > 0) {
            const sortedHistory = history.sort((a, b) => a.lastVisitTime - b.lastVisitTime);
            const sessions = {};
            const SESSION_TIMEOUT = 60 * 60 * 1000;

            sortedHistory.forEach(item => {
                if (!item.lastVisitTime || !item.url) return;
                if (shouldFilterUrl(item.url)) return;

                const pattern = extractPattern(item.url);
                const currentTime = item.lastVisitTime;

                if (!sessions[pattern]) {
                    sessions[pattern] = { start: currentTime, end: currentTime };
                    processedEvents.push({
                        type: 'browser',
                        timestamp: currentTime,
                        title: item.title || 'Website Visit',
                        description: simplifyUrl(item.url),
                        url: item.url,
                        duration: 0
                    });
                    return;
                }

                const session = sessions[pattern];
                const timeSinceLast = currentTime - session.end;

                if (timeSinceLast < SESSION_TIMEOUT) {
                    sessions[pattern].end = currentTime;
                    const duration = Math.floor((currentTime - session.start) / 60000);
                    const lastEvent = processedEvents.find(e => e.type === 'browser' && e.url === item.url);
                    if (lastEvent) {
                        lastEvent.duration = duration;
                    }
                } else {
                    sessions[pattern] = { start: currentTime, end: currentTime };
                    processedEvents.push({
                        type: 'browser',
                        timestamp: currentTime,
                        title: item.title || 'Website Visit',
                        description: simplifyUrl(item.url),
                        url: item.url,
                        duration: 0
                    });
                }
            });
        }

        // Process Drive files
        if (drive && drive.files && drive.files.length > 0) {
            drive.files.forEach(file => {
                if (file.modifiedTime) {
                    const timestamp = safeGetTimestamp(file.modifiedTime);
                    if (timestamp > 0) {
                        processedEvents.push({
                            type: 'drive',
                            timestamp: timestamp,
                            title: 'Drive File Edit',
                            description: file.name,
                            webViewLink: file.webViewLink,
                            changes: file.lastModifyingUser ? `Modified by ${file.lastModifyingUser.displayName}` : 'Modified'
                        });
                    }
                }
            });
        }

        // Process emails
        if (emails && (emails.all || emails.sent || emails.received)) {
            const emailList = emails.all || [...(emails.sent || []), ...(emails.received || [])];
            
            emailList.forEach(email => {
                if (email.timestamp) {
                    processedEvents.push({
                        type: 'email',
                        timestamp: Number(email.timestamp),
                        title: email.type === 'sent' ? 'Email Sent' : 'Email Received',
                        description: email.type === 'sent' ? `To: ${email.to || 'No recipient'}` : `From: ${email.from || 'No sender'}`,
                        subject: email.subject || 'No subject',
                        from: email.from,
                        to: email.to,
                        emailUrl: email.threadId ? `https://mail.google.com/mail/u/0/#inbox/${email.threadId}` : null
                    });
                }
            });
        }

        // Process calendar events
        if (calendar && calendar.today && calendar.today.length > 0) {
            calendar.today.forEach(event => {
                const eventTime = event.start?.dateTime || event.start?.date;
                if (eventTime) {
                    const timestamp = safeGetTimestamp(eventTime);
                    if (timestamp > 0) {
                        processedEvents.push({
                            type: 'calendar',
                            timestamp: timestamp,
                            title: 'Calendar Event',
                            description: event.summary || 'Untitled event',
                            calendarName: event.calendarName,
                            location: event.location,
                            duration: event.end ? `${new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'All day',
                            eventUrl: event.htmlLink
                        });
                    }
                }
            });
        }

        // Sort all events by timestamp
        processedEvents.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate total time span
        const currentTime = Date.now();
        const oldestEvent = processedEvents[0]?.timestamp || currentTime;
        const totalTimeSpan = currentTime - oldestEvent;

        // Create event elements with equal spacing
        processedEvents.forEach((event, index) => {
            const eventDiv = document.createElement('div');
            eventDiv.className = `timeline-event ${index % 2 === 0 ? 'above' : 'below'}`;
            
            // Calculate position based on index (equal spacing)
            const position = (index / (processedEvents.length - 1)) * 100;
            eventDiv.style.left = `${position}%`;

            const timeText = new Date(Number(event.timestamp)).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const eventDetails = getEventDetails(event);
            const popupContent = `
                <div class="timeline-dot"></div>
                <div class="event-popup">
                    <div class="date">${eventDetails.title}</div>
                    <div class="title">${timeText}</div>
                    ${eventDetails.details.map(detail => `
                        <div class="detail-item">
                            <span class="detail-label">${detail.label}:</span>
                            ${detail.isLink 
                                ? `<a href="${detail.url}" class="detail-value link" target="_blank">${detail.value}</a>`
                                : `<span class="detail-value">${detail.value}</span>`
                            }
                        </div>
                    `).join('')}
                </div>
            `;

            eventDiv.innerHTML = popupContent;
            eventDiv.setAttribute('data-category', getEventCategory(event));

            // After setting innerHTML, add event listeners to all buttons
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

            timelineEvents.appendChild(eventDiv);
        });

        // Add "NOW" marker at the right end
        const nowMarker = document.createElement('div');
        nowMarker.className = 'timeline-now-marker';
        nowMarker.style.left = '100%';
        nowMarker.innerHTML = '<div class="now-text">NOW</div>';
        timelineEvents.appendChild(nowMarker);

        const container = document.querySelector('.timeline-container');
        if (container) {
        container.scrollLeft = container.scrollWidth;
        }
    }

    function simplifyUrl(url) {
        try {
            const parsedUrl = new URL(url);
            let cleanUrl = parsedUrl.hostname + parsedUrl.pathname;
            
            if (cleanUrl.length > 30) {
                return cleanUrl.substring(0, 30) + '...';
            }

            return cleanUrl;
        } catch {
            return url;
        }
    }

    function extractPattern(url) {
        try {
            const parsedUrl = new URL(url);
            const domain = parsedUrl.hostname;
            const parts = domain.split('.');
            // Remove TLDs and subdomains, get middle word if exists
            if (parts.length >= 3) {
                return parts[parts.length - 3]; // e.g., colman.ac.il → "colman"
            } else if (parts.length >= 2) {
                return parts[0]; // e.g., zoom.us → "zoom"
            }
            return domain;
        } catch {
            return '';
        }
    }

    function getEventCategory(event) {
        if (event.type === 'email') return 'gmail';
        if (event.type === 'calendar') return 'calendar';
        if (event.type === 'drive') return 'drive';
        return 'browser';
    }

    function formatDuration(minutes) {
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    function getEventDetails(event) {
        switch (event.type) {
            case 'drive':
                return {
                    title: 'Drive File Activity',
                    details: [
                        { 
                            label: 'File Name', 
                            value: event.description,
                            isLink: true,
                            url: event.webViewLink || '#'
                        },
                        { label: 'Last Edit', value: new Date(event.timestamp).toLocaleTimeString() },
                        { label: 'Duration', value: event.duration ? formatDuration(event.duration) : 'N/A' },
                        { label: 'Changes', value: event.changes || 'Content modified' }
                    ],
                    actions: [] // Remove buttons
                };
            case 'browser':
                const isLocalFile = event.url.startsWith('file://');
                return {
                    title: 'Browser Activity',
                    details: [
                        { 
                            label: 'Website', 
                            value: event.description,
                            isLink: true,
                            url: event.url
                        },
                        { label: 'Title', value: event.title },
                        { label: 'Duration', value: event.duration ? formatDuration(event.duration) : 'N/A' }
                    ],
                    actions: isLocalFile ? [
                        { 
                            label: 'Find File', 
                            onClick: async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const filePath = decodeURIComponent(event.url.replace('file:///', ''));
                                const fileName = filePath.split('/').pop();
                                
                                // Create or update status div
                                const popup = e.target.closest('.event-popup');
                                const actionsDiv = popup.querySelector('.event-actions');
                                
                                let statusDiv = actionsDiv.querySelector('.file-status');
                                if (!statusDiv) {
                                    statusDiv = document.createElement('div');
                                    statusDiv.className = 'file-status';
                                    actionsDiv.insertBefore(statusDiv, e.target);
                                }

                                try {
                                    // Show searching message
                                    statusDiv.className = 'file-status';
                                    statusDiv.textContent = `Searching for "${fileName}"...`;
                                    statusDiv.style.display = 'block';
                                    statusDiv.style.opacity = '1';

                                    // First try exact filename match
                                    let downloadItems = await chrome.downloads.search({ 
                                        query: [fileName],
                                        exists: true
                                    });
                                    
                                    // If no exact match, try partial filename match
                                    if (!downloadItems || downloadItems.length === 0) {
                                        downloadItems = await chrome.downloads.search({ 
                                            exists: true
                                        });
                                        downloadItems = downloadItems.filter(item => 
                                            item.filename.toLowerCase().includes(fileName.toLowerCase())
                                        );
                                    }
                                    
                                    
                                    if (downloadItems && downloadItems.length > 0) {
                                        // Sort by most recent first
                                        downloadItems.sort((a, b) => b.startTime - a.startTime);
                                        
                                        // Found the file in downloads
                                        statusDiv.className = 'file-status success';
                                        statusDiv.textContent = 'Opening file...';
                                        
                                        try {
                                            // Try to open the file using the download ID
                                            await chrome.downloads.open(downloadItems[0].id);
                                            statusDiv.textContent = 'File opened successfully!';
                                        } catch (error) {
                                            console.log('Failed to open using download ID, trying alternative method:', error);
                                            
                                            // If we can't open by ID, show the file path and provide a copy button
                                            try {
                                                
                                                // Create status message
                                                const statusDiv = document.createElement('div');
                                                statusDiv.className = 'file-status';
                                                statusDiv.textContent = 'File found! You can:';
                                                actionsDiv.appendChild(statusDiv);
                                                
                                                // Create a container for the buttons
                                                const buttonContainer = document.createElement('div');
                                                buttonContainer.className = 'button-container';
                                                buttonContainer.style.marginTop = '8px';
                                                buttonContainer.style.display = 'flex';
                                                buttonContainer.style.gap = '8px';
                                                
                                                // Add "Open in Downloads" button
                                                const openButton = document.createElement('button');
                                                openButton.className = 'action-button';
                                                openButton.textContent = 'Open in Downloads';
                                                openButton.onclick = () => {
                                                    chrome.downloads.showDefaultFolder();
                                                };
                                                buttonContainer.appendChild(openButton);
                                                
                                                actionsDiv.appendChild(buttonContainer);
                                                
                                            } catch (error) {
                                                console.error('Error handling file path:', error);
                                                const statusDiv = document.createElement('div');
                                                statusDiv.className = 'file-status error';
                                                statusDiv.textContent = 'Error handling file path. Please try opening it manually from your downloads folder.';
                                                actionsDiv.appendChild(statusDiv);
                                            }
                                        }
                                        
                                        setTimeout(() => {
                                            statusDiv.style.opacity = '0';
                                            setTimeout(() => statusDiv.style.display = 'none', 300);
                                        }, 2000);
                                    } else {
                                        // File not found in downloads
                                        statusDiv.className = 'file-status warning';
                                        statusDiv.innerHTML = `
                                            <div class="error-message">
                                                <div class="error-title">File Not Found</div>
                                                <div class="error-details">
                                                    The file is not in your Downloads folder. You can:
                                                    <ul>
                                                        <li>Check your Downloads folder manually</li>
                                                        <li>Look for the file in its original location</li>
                                                    </ul>
                                                </div>
                                            </div>`;
                                        statusDiv.style.display = 'block';
                                        statusDiv.style.opacity = '1';
                                        
                                        // Remove the Find File button
                                        const findFileButton = actionsDiv.querySelector('.action-button');
                                        if (findFileButton) {
                                            findFileButton.remove();
                                        }
                                        
                                        // Add "Open in Downloads" button
                                        const openButton = document.createElement('button');
                                        openButton.className = 'action-button';
                                        openButton.textContent = 'Open in Downloads';
                                        openButton.onclick = () => {
                                            chrome.downloads.showDefaultFolder();
                                        };
                                        actionsDiv.appendChild(openButton);
                                    }
                                } catch (error) {
                                    console.error('Error in Find File handler:', error);
                                    statusDiv.className = 'file-status error';
                                    statusDiv.textContent = 'Error: Could not search for the file';
                                    statusDiv.style.display = 'block';
                                    statusDiv.style.opacity = '1';
                                }
                            }
                        }
                    ] : [
                        { 
                            label: 'Visit Site', 
                            url: event.url,
                            onClick: (e) => {
                                e.preventDefault();
                                window.open(event.url, '_blank');
                            }
                        }
                    ]
                };
            case 'email':
                return {
                    title: event.title,
                    details: [
                        { 
                            label: 'Subject', 
                            value: event.subject || 'No subject',
                            isLink: true,
                            url: event.emailUrl || '#'
                        }
                    ],
                    actions: [] // Remove buttons
                };
            case 'calendar':
                return {
                    title: 'Calendar Event',
                    details: [
                        { label: 'Location', value: event.location || 'No location' },
                        { 
                            label: 'Calendar', 
                            value: event.summaryOverride || event.calendarName || 'Default',
                            isLink: true,
                            url: event.eventUrl || '#'
                        }
                    ],
                    actions: [] // Remove buttons
                };
            default:
                return {
                    title: 'Browser Activity',
                    details: [
                        { 
                            label: 'Website', 
                            value: event.description,
                            isLink: true,
                            url: event.url || '#'
                        },
                        { label: 'Title', value: event.title },
                        { label: 'Duration', value: event.duration ? formatDuration(event.duration) : 'N/A' }
                    ],
                    actions: [] // Remove buttons
                };
        }
    }

    function timestampToPercentage(timestamp) {
        const { start, end } = getCurrentTimeRange();
        const eventTime = new Date(Number(timestamp));
        
        // Simple percentage calculation
        const totalMs = end.getTime() - start.getTime();
        const eventMs = eventTime.getTime() - start.getTime();
        const percentage = (eventMs / totalMs) * 100;
        
        // Add small padding
        const padding = 2;
        return Math.max(padding, Math.min(100 - padding, percentage));
    }


    function timestampToGlobalPercentage(timestamp) {
        const start = window.globalStartTime;
        const end = Date.now(); // or keep extending max rightward

        const totalSpan = end - start;
        const offset = timestamp - start;

        const percentage = (offset / totalSpan) * 100;

        const padding = 2;
        return Math.max(padding, Math.min(100 - padding, percentage));
    }



    export function buildTimeline(history, drive, emails, calendar) {
        const timelineEvents = document.getElementById('timeline-events');
        if (!timelineEvents) return;
    
        // Initialize controls
        initializeTimePeriodControls(history, drive, emails, calendar);
        updateTimePeriodDisplay();
    
        // Initial build
        rebuildTimeline(history, drive, emails, calendar);
    }