import { safeGetTimestamp } from '../utils/dateUtils.js';
import { shouldFilterUrl } from '../services/browserHistoryService.js';

// Define zoom levels in milliseconds
const ZOOM_LEVELS = {
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000
};

let currentZoomLevel = '15m';

// Define buildTimeline function at the top level
export function buildTimeline(history, drive, emails, calendar) {
    const timelineEvents = document.getElementById('timeline-events');
    if (!timelineEvents) return;
  
    // Initialize zoom controls
    initializeZoomControls();
  
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
  
    const events = [];
  
    // Timeline from 6 AM to 10 PM
    const timelineStartHour = 6;
    const timelineEndHour = 22;
  
    // Get the user's timezone
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Get the region from the timezone (e.g., 'Asia' from 'Asia/Jerusalem')
    const region = userTimeZone.split('/')[0];

    // Define regions that typically use 24-hour format
    const regions24Hour = ['Asia', 'Europe', 'Africa'];
    const use24HourFormat = regions24Hour.includes(region);
  
    function timestampToPercentage(timestamp) {
      const date = new Date(Number(timestamp));
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      const startMinutes = timelineStartHour * 60;
      const endMinutes = timelineEndHour * 60;
      const percentage = ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
      return Math.min(Math.max(percentage, 0), 100);
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
              { label: 'File Name', value: event.description },
              { label: 'Last Edit', value: new Date(event.timestamp).toLocaleTimeString() },
              { label: 'Duration', value: event.duration ? formatDuration(event.duration) : 'N/A' },
              { label: 'Changes', value: event.changes || 'Content modified' }
            ],
            actions: [
              { 
                label: 'Open in Drive', 
                url: event.webViewLink || '#',
                onClick: (e) => {
                  e.preventDefault();
                  if (event.webViewLink) {
                    window.open(event.webViewLink, '_blank');
                  } else {
                    console.error('No webViewLink available for file:', event);
                    alert('Unable to open file. Drive link not available.');
                  }
                }
              }
            ]
          };
        case 'browser':
          const isLocalFile = event.url.startsWith('file://');
          return {
            title: 'Browser Activity',
            details: [
              { label: 'Website', value: event.description },
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
          const emailTime = new Date(Number(event.timestamp)).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          return {
            title: event.title,
            details: [
              { label: 'Subject', value: event.subject || 'No subject' }
            ],
            actions: [
              { label: 'Open Email', url: event.emailUrl || '#' }
            ]
          };
        case 'calendar':
          return {
            title: 'Calendar Event',
            details: [
              { label: 'Location', value: event.location || 'No location' },
              { label: 'Calendar', value: event.summaryOverride || event.calendarName || 'Default' }
            ],
            actions: [
              { label: 'View Event', url: event.eventUrl || '#' }
            ]
          };
        default:
          return {
            title: 'Browser Activity',
            details: [
              { label: 'Website', value: event.description },
              { label: 'Title', value: event.title },
              { label: 'Duration', value: event.duration ? formatDuration(event.duration) : 'N/A' }
            ],
            actions: [
              { label: 'Visit Site', url: event.url || '#' }
            ]
          };
      }
    }
  
    function groupEventsByTimeInterval(events) {
        const groupedEvents = {};
        const interval = ZOOM_LEVELS[currentZoomLevel];

        events.forEach(event => {
            const timestamp = Number(event.timestamp);
            const intervalStart = Math.floor(timestamp / interval) * interval;
            
            if (!groupedEvents[intervalStart]) {
                groupedEvents[intervalStart] = {
                    timestamp: intervalStart,
                    events: [],
                    categories: new Set()
                };
            }
            
            groupedEvents[intervalStart].events.push(event);
            groupedEvents[intervalStart].categories.add(getEventCategory(event));
        });

        return Object.values(groupedEvents);
    }

    function initializeZoomControls() {
        const zoomButtons = document.querySelectorAll('.zoom-button');
        zoomButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active state
                zoomButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update zoom level and rebuild timeline
                currentZoomLevel = button.id.replace('zoom-', '');
                rebuildTimeline();
            });
        });
    }

    function rebuildTimeline() {
        const processedEvents = [];
        
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

        // Group events by time interval
        const groupedEvents = groupEventsByTimeInterval(processedEvents);

        // Clear existing events
        timelineEvents.innerHTML = '';

        // Build timeline events
        groupedEvents.forEach((group, index) => {
            const eventDiv = document.createElement('div');
            eventDiv.className = `timeline-event ${index % 2 === 0 ? 'above' : 'below'}`;
            
            // Set category based on the most common category in the group
            const categories = Array.from(group.categories);
            eventDiv.setAttribute('data-category', categories[0] || 'browser');
            
            eventDiv.style.left = `${timestampToPercentage(group.timestamp)}%`;

            const timeText = new Date(Number(group.timestamp)).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const eventDetails = {
                title: `${group.events.length} Events`,
                details: [
                    { label: 'Time Range', value: `${timeText} - ${new Date(Number(group.timestamp + ZOOM_LEVELS[currentZoomLevel])).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` },
                    { label: 'Event Count', value: group.events.length }
                ],
                actions: []
            };

            const popupContent = `
                <div class="timeline-dot"></div>
                <div class="event-popup">
                    <div class="event-title">${eventDetails.title}</div>
                    <div class="event-time">${timeText}</div>
                    <div class="event-description">${group.events.map(e => e.description).join(', ')}</div>
                    <div class="event-details">
                        ${eventDetails.details.map(detail => `
                            <div class="detail-item">
                                <span class="detail-label">${detail.label}:</span>
                                <span class="detail-value">${detail.value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            eventDiv.innerHTML = popupContent;

            // Add click handler for expanding details
            const popup = eventDiv.querySelector('.event-popup');
            eventDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!e.target.closest('.action-button')) {
                    document.querySelectorAll('.event-popup.expanded').forEach(otherPopup => {
                        if (otherPopup !== popup) {
                            otherPopup.classList.remove('expanded');
                        }
                    });
                    popup.classList.toggle('expanded');
                }
            });

            timelineEvents.appendChild(eventDiv);
        });
    }

    // Initial build
    rebuildTimeline();
}