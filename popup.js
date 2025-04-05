// Define buildTimeline function at the top level
function buildTimeline(history, drive, emails, calendar) {
  const timelineEvents = document.getElementById('timeline-events');
  if (!timelineEvents) return;

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
                const filePath = decodeURIComponent(event.url.replace('file:///', ''));
                // First try to find in downloads
                try {
                  const downloadItem = await chrome.downloads.search({ 
                    filename: filePath.split('/').pop(),
                    exists: true
                  });
                  
                  if (downloadItem && downloadItem.length > 0) {
                    chrome.downloads.open(downloadItem[0].id);
                  } else {
                    // If not in downloads, show the file location
                    alert(`File might have been moved. Original location was:\n${filePath}`);
                  }
                } catch (error) {
                  console.error('Error finding file:', error);
                  alert('Could not locate the file. It might have been moved or deleted.');
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
            { label: 'From', value: event.from || 'N/A' },
            { label: 'To', value: event.to || 'N/A' },
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
            { label: 'Event', value: event.description },
            { label: 'Time', value: event.duration || 'All day' },
            { label: 'Location', value: event.location || 'No location' },
            { label: 'Calendar', value: event.calendarName || 'Default' }
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

  // Process events and add type information
  const processedEvents = [];
  
  // Process browser history
  if (history && history.length > 0) {
    const sortedHistory = history.sort((a, b) => a.lastVisitTime - b.lastVisitTime);
    const sessions = {};
    const SESSION_TIMEOUT = 60 * 60 * 1000;

    sortedHistory.forEach(item => {
      if (!item.lastVisitTime || !item.url) return;
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
        const duration = Math.floor((currentTime - session.start) / 60000); // Convert to minutes
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
        processedEvents.push({
          type: 'drive',
          timestamp: new Date(file.modifiedTime).getTime(),
          title: 'Drive File Edit',
          description: file.name,
          webViewLink: file.webViewLink,
          changes: file.lastModifyingUser ? `Modified by ${file.lastModifyingUser.displayName}` : 'Modified'
        });
      }
    });
  }

  // Process emails
  if (emails && emails.all && emails.all.length > 0) {
    emails.all.forEach(email => {
      if (email.timestamp) {
        processedEvents.push({
          type: 'email',
          timestamp: email.timestamp,
          title: email.type === 'sent' ? 'Email Sent' : 'Email Received',
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
        processedEvents.push({
          type: 'calendar',
          timestamp: new Date(eventTime).getTime(),
          title: 'Calendar Event',
          description: event.summary || 'Untitled event',
          calendarName: event.calendarName,
          location: event.location,
          duration: event.end ? `${new Date(event.start.dateTime).toLocaleTimeString()} - ${new Date(event.end.dateTime).toLocaleTimeString()}` : 'All day',
          eventUrl: event.htmlLink
        });
      }
    });
  }

  // Sort all events by timestamp
  processedEvents.sort((a, b) => a.timestamp - b.timestamp);

  // Clear existing events
  timelineEvents.innerHTML = '';

  // Build timeline events
  processedEvents.forEach((event, index) => {
    const eventDiv = document.createElement('div');
    eventDiv.className = `timeline-event ${index % 2 === 0 ? 'above' : 'below'}`;
    eventDiv.setAttribute('data-category', getEventCategory(event));
    eventDiv.style.left = `${timestampToPercentage(event.timestamp)}%`;

    const timeText = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eventDetails = getEventDetails(event);

    const popupContent = `
      <div class="timeline-dot"></div>
      <div class="event-popup">
        <div class="event-title">${eventDetails.title}</div>
        <div class="event-time">${timeText}</div>
        <div class="event-description">${event.description}</div>
        <div class="event-details">
          ${eventDetails.details.map(detail => `
            <div class="detail-item">
              <span class="detail-label">${detail.label}:</span>
              <span class="detail-value">${detail.value}</span>
            </div>
          `).join('')}
          <div class="event-actions">
            ${eventDetails.actions.map(action => `
              <a href="${action.url || '#'}" class="action-button" data-action='${JSON.stringify(action)}'>${action.label}</a>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    eventDiv.innerHTML = popupContent;

    // Add click handler for expanding details
    const popup = eventDiv.querySelector('.event-popup');
    eventDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      // Don't toggle if clicking an action button
      if (!e.target.closest('.action-button')) {
        popup.classList.toggle('expanded');
      }
    });

    // Add click handlers for actions
    eventDiv.querySelectorAll('.action-button').forEach(button => {
      const action = JSON.parse(button.dataset.action);
      if (action.onClick) {
        button.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent the popup from toggling
          action.onClick(e);
        });
      }
    });

    // Close expanded popup when clicking outside
    document.addEventListener('click', () => {
      const popup = eventDiv.querySelector('.event-popup');
      popup.classList.remove('expanded');
    });

    timelineEvents.appendChild(eventDiv);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById('login-button');
  const loginSection = document.getElementById('login-section');
  const loadingSection = document.getElementById('loading');
  const timelineWrapper = document.querySelector('.timeline-wrapper');
  const timelineEvents = document.getElementById('timeline-events');
  const timelineDate = document.querySelector('.timeline-date');
  const prevDayButton = document.getElementById('prev-day');
  const nextDayButton = document.getElementById('next-day');

  let currentDate = new Date();
  let currentTimelineData = null;

  // Check if user is already logged in
  chrome.storage.local.get(['isLoggedIn', 'lastUpdate'], function(result) {
    if (result.isLoggedIn) {
      showTimeline();
    } else {
      showLogin();
    }
  });

  if (loginButton) {
    loginButton.addEventListener('click', function() {
      if (loadingSection) loadingSection.style.display = 'block';
      loginButton.disabled = true;
      
      chrome.runtime.sendMessage({ action: 'login' }, function(response) {
        if (response && response.success) {
          showTimeline();
        } else {
          if (loadingSection) loadingSection.style.display = 'none';
          loginButton.disabled = false;
          alert('Login failed: ' + (response?.error || 'Unknown error'));
        }
      });
    });
  }

  function showLogin() {
    if (loginSection) loginSection.style.display = 'block';
    if (loadingSection) loadingSection.style.display = 'none';
    if (timelineWrapper) timelineWrapper.style.display = 'none';
  }

  function showTimeline() {
    if (loginSection) loginSection.style.display = 'none';
    if (timelineWrapper) timelineWrapper.style.display = 'block';
    
    // Cache for timeline data
    const timelineCache = new Map();
    let currentDate = new Date();

    // Function to get date key for cache
    function getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    // Initial data load for 3 days (yesterday, today, tomorrow)
    const initialDates = [
        new Date(currentDate.getTime() - 86400000), // yesterday
        new Date(currentDate), // today
        new Date(currentDate.getTime() + 86400000) // tomorrow
    ];

    // Load initial data
    Promise.all(initialDates.map(date => {
        return Promise.all([
            getBrowserHistory(date),
            getGoogleDriveActivity(date),
            getGmailActivity(date),
            getCalendarEvents()
        ]).then(([history, drive, emails, calendar]) => {
            const dateKey = getDateKey(date);
            timelineCache.set(dateKey, { history, drive, emails, calendar });
        });
    })).then(() => {
        // Initial display
        const data = timelineCache.get(getDateKey(currentDate));
        buildTimeline(data.history, data.drive, data.emails, data.calendar);
        if (loadingSection) loadingSection.style.display = 'none';
        if (timelineWrapper) timelineWrapper.style.display = 'block';

        // Add navigation button functionality
        const prevDayButton = document.getElementById('prev-day');
        const nextDayButton = document.getElementById('next-day');
        const timelineDate = document.querySelector('.timeline-date');

        function formatDate(date) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
                return 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            } else {
                return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            }
        }

        function updateTimelineDate() {
            if (timelineDate) {
                timelineDate.textContent = formatDate(currentDate);
            }
        }

        function updateTimeline(date) {
            const dateKey = getDateKey(date);
            const cachedData = timelineCache.get(dateKey);

            if (cachedData) {
                // Use cached data
                buildTimeline(cachedData.history, cachedData.drive, cachedData.emails, cachedData.calendar);
            } else {
                // If not in cache, fetch and cache for future
                if (timelineEvents) {
                    timelineEvents.innerHTML = '<div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: #ffffff;">Loading...</div>';
                }

                Promise.all([
                    getBrowserHistory(date),
                    getGoogleDriveActivity(date),
                    getGmailActivity(date),
                    getCalendarEvents()
                ]).then(([history, drive, emails, calendar]) => {
                    timelineCache.set(dateKey, { history, drive, emails, calendar });
                    buildTimeline(history, drive, emails, calendar);
                }).catch(error => {
                    console.error('Error loading timeline data:', error);
                    if (timelineEvents) {
                        timelineEvents.innerHTML = `<div class="error" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: #ff4444;">Error loading timeline data</div>`;
                    }
                });
            }
        }

        if (prevDayButton) {
            prevDayButton.addEventListener('click', () => {
                currentDate.setDate(currentDate.getDate() - 1);
                updateTimelineDate();
                updateTimeline(currentDate);
            });
        }

        if (nextDayButton) {
            nextDayButton.addEventListener('click', () => {
                currentDate.setDate(currentDate.getDate() + 1);
                updateTimelineDate();
                updateTimeline(currentDate);
            });
        }

        // Initial setup
        updateTimelineDate();
    }).catch(error => {
        console.error('Error fetching initial data:', error);
        if (loadingSection) loadingSection.style.display = 'none';
        if (timelineEvents) {
            timelineEvents.innerHTML = `<div class="error">Error loading timeline: ${error.message}</div>`;
        }
    });
  }

  function formatEventTime(event) {
    if (!event.start) return 'Time not specified';
    
    if (event.start.dateTime) {
      const time = new Date(event.start.dateTime);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return 'All day';
  }

  function displaySummary(history, drive, yesterdayEmails, todayEmails, calendar) {
    // Display yesterday's activity
    let yesterdayHtml = '';

    // Display browser history
    if (history && history.length > 0) {
      yesterdayHtml += '<h3>Websites Visited:</h3><ul>';
      history.slice(0, 5).forEach(item => {
        yesterdayHtml += `<li>${item.title || 'Untitled'}</li>`;
      });
      yesterdayHtml += '</ul>';
    }

    // Display Drive activity
    if (drive && drive.files && drive.files.length > 0) {
      yesterdayHtml += '<h3>Documents Edited:</h3><ul>';
      drive.files.forEach(doc => {
        yesterdayHtml += `<li>${doc.name || 'Untitled document'}</li>`;
      });
      yesterdayHtml += '</ul>';
    } else if (drive && drive.error) {
      yesterdayHtml += `<div class="error">Drive error: ${drive.error}</div>`;
    }

    // Display yesterday's email activity
    if (yesterdayEmails && (yesterdayEmails.sent?.length > 0 || yesterdayEmails.received?.length > 0)) {
      console.log('Yesterday emails:', yesterdayEmails);
      yesterdayHtml += '<h3>Yesterday\'s Email Activity:</h3>';
      
      // Display received emails
      if (yesterdayEmails.received && yesterdayEmails.received.length > 0) {
        yesterdayHtml += '<h4>Received Emails:</h4><ul>';
        yesterdayEmails.received.forEach(email => {
          console.log('Displaying received email:', email);
          yesterdayHtml += `<li>
            <span class="email-from">From: ${email.from || 'Unknown'}</span>
            <span class="email-subject">${email.subject || 'No subject'}</span>
          </li>`;
        });
        yesterdayHtml += '</ul>';
      }

      // Display sent emails
      if (yesterdayEmails.sent && yesterdayEmails.sent.length > 0) {
        yesterdayHtml += '<h4>Sent Emails:</h4><ul>';
        yesterdayEmails.sent.forEach(email => {
          console.log('Displaying sent email:', email);
          yesterdayHtml += `<li>
            <span class="email-to">To: ${email.to || 'Unknown'}</span>
            <span class="email-subject">${email.subject || 'No subject'}</span>
          </li>`;
        });
        yesterdayHtml += '</ul>';
      }
    } else if (yesterdayEmails && yesterdayEmails.error) {
      yesterdayHtml += `<div class="error">Gmail error: ${yesterdayEmails.error}</div>`;
    } else {
      yesterdayHtml += '<div class="notice">No email activity found for yesterday</div>';
    }

    yesterdayContent.innerHTML = yesterdayHtml || '<div class="notice">No activity found for yesterday</div>';

    // Display today's email activity
    if (todayEmails && (todayEmails.sent?.length > 0 || todayEmails.received?.length > 0)) {
      console.log('Today emails:', todayEmails);
      let todayHtml = '<h3>Today\'s Email Activity:</h3>';
      
      // Display received emails
      if (todayEmails.received && todayEmails.received.length > 0) {
        todayHtml += '<h4>Received Emails:</h4><ul>';
        todayEmails.received.forEach(email => {
          console.log('Displaying received email:', email);
          todayHtml += `<li>
            <span class="email-from">From: ${email.from || 'Unknown'}</span>
            <span class="email-subject">${email.subject || 'No subject'}</span>
          </li>`;
        });
        todayHtml += '</ul>';
      }

      // Display sent emails
      if (todayEmails.sent && todayEmails.sent.length > 0) {
        todayHtml += '<h4>Sent Emails:</h4><ul>';
        todayEmails.sent.forEach(email => {
          console.log('Displaying sent email:', email);
          todayHtml += `<li>
            <span class="email-to">To: ${email.to || 'Unknown'}</span>
            <span class="email-subject">${email.subject || 'No subject'}</span>
          </li>`;
        });
        todayHtml += '</ul>';
      }

      // Add today's email activity to the summary section
      const todayEmailSection = document.createElement('div');
      todayEmailSection.className = 'section';
      todayEmailSection.innerHTML = `
        <div class="section-title">Today's Email Activity</div>
        <div class="content">${todayHtml}</div>
      `;
      summarySection.appendChild(todayEmailSection);
    } else if (todayEmails && todayEmails.error) {
      const todayEmailSection = document.createElement('div');
      todayEmailSection.className = 'section';
      todayEmailSection.innerHTML = `
        <div class="section-title">Today's Email Activity</div>
        <div class="content"><div class="error">Gmail error: ${todayEmails.error}</div></div>
      `;
      summarySection.appendChild(todayEmailSection);
    } else {
      const todayEmailSection = document.createElement('div');
      todayEmailSection.className = 'section';
      todayEmailSection.innerHTML = `
        <div class="section-title">Today's Email Activity</div>
        <div class="content"><div class="notice">No email activity found for today</div></div>
      `;
      summarySection.appendChild(todayEmailSection);
    }

    // Display today's calendar events
    if (calendar && calendar.today && calendar.today.length > 0) {
      let todayHtml = '<ul>';
      calendar.today.forEach(event => {
        const time = formatEventTime(event);
        const calendarName = event.calendarName ? `<span class="calendar-name" style="color: ${event.calendarColor}">${event.calendarName}</span>` : '';
        todayHtml += `
          <li style="border-left-color: ${event.calendarColor || '#1a73e8'}">
            <span class="time">${time}</span>
            ${event.summary || 'Untitled event'}
            ${calendarName}
          </li>`;
      });
      todayHtml += '</ul>';
      todayCalendarContent.innerHTML = todayHtml;
    } else if (calendar && calendar.error) {
      todayCalendarContent.innerHTML = `<div class="error">Calendar error: ${calendar.error}</div>`;
    } else {
      todayCalendarContent.innerHTML = '<div class="notice">No events scheduled for today</div>';
    }

    // Display tomorrow's calendar events
    if (calendar && calendar.tomorrow && calendar.tomorrow.length > 0) {
      let tomorrowHtml = '<ul>';
      calendar.tomorrow.forEach(event => {
        const time = formatEventTime(event);
        const calendarName = event.calendarName ? `<span class="calendar-name" style="color: ${event.calendarColor}">${event.calendarName}</span>` : '';
        tomorrowHtml += `
          <li style="border-left-color: ${event.calendarColor || '#1a73e8'}">
            <span class="time">${time}</span>
            ${event.summary || 'Untitled event'}
            ${calendarName}
          </li>`;
      });
      tomorrowHtml += '</ul>';
      tomorrowCalendarContent.innerHTML = tomorrowHtml;
    } else if (calendar && calendar.error) {
      tomorrowCalendarContent.innerHTML = `<div class="error">Calendar error: ${calendar.error}</div>`;
    } else {
      tomorrowCalendarContent.innerHTML = '<div class="notice">No events scheduled for tomorrow</div>';
    }

    // Function to format date for display
    function formatDate(date) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      }
    }

    // Function to update timeline date display
    function updateTimelineDate() {
      if (timelineDate) {
        timelineDate.textContent = formatDate(currentDate);
      }
    }

    // Function to load timeline data for a specific date
    async function loadTimelineData(date) {
      if (loadingSection) loadingSection.style.display = 'block';
      if (timelineEvents) timelineEvents.innerHTML = '';

      try {
        const [history, drive, emails, calendar] = await Promise.all([
          getBrowserHistory(date),
          getGoogleDriveActivity(date),
          getGmailActivity(date),
          getCalendarEvents()
        ]);

        buildTimeline(history, drive, emails, calendar);
        currentTimelineData = { history, drive, emails, calendar };
      } catch (error) {
        console.error('Error loading timeline data:', error);
        if (timelineEvents) {
          timelineEvents.innerHTML = `<div class="error">Error loading timeline data</div>`;
        }
      } finally {
        if (loadingSection) loadingSection.style.display = 'none';
      }
    }

    // Event listeners for navigation buttons
    if (prevDayButton) {
      prevDayButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateTimelineDate();
        loadTimelineData(currentDate);
      });
    }

    if (nextDayButton) {
      nextDayButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateTimelineDate();
        loadTimelineData(currentDate);
      });
    }

    // Initial setup
    updateTimelineDate();
    loadTimelineData(currentDate);
  }

  function getBrowserHistory(date) {
    return new Promise((resolve) => {
      const startTime = new Date(date);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(23, 59, 59, 999);
      
      chrome.history.search({
        text: '',
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        maxResults: 100
      }, function(historyItems) {
        resolve(historyItems || []);
      });
    });
  }

  function getGoogleDriveActivity(date) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'getDriveActivity', 
        date: date.toISOString()
      }, function(response) {
        resolve(response || { files: [] });
      });
    });
  }

  function getGmailActivity(date) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'getGmailActivity', 
        date: date.toISOString()
      }, function(response) {
        resolve(response || { emails: [] });
      });
    });
  }

  function getCalendarEvents() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCalendarEvents' }, function(response) {
        resolve(response || { today: [], tomorrow: [] });
      });
    });
  }
}); 