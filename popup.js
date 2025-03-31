document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById('login-button');
  const loginSection = document.getElementById('login-section');
  const summarySection = document.getElementById('summary-section');
  const todayCalendarSection = document.getElementById('today-calendar-section');
  const tomorrowCalendarSection = document.getElementById('tomorrow-calendar-section');
  const loadingSection = document.getElementById('loading');
  const yesterdayContent = document.getElementById('yesterday-content');
  const todayCalendarContent = document.getElementById('today-calendar-content');
  const tomorrowCalendarContent = document.getElementById('tomorrow-calendar-content');

  // Check if user is already logged in
  chrome.storage.local.get(['isLoggedIn', 'lastUpdate'], function(result) {
    if (result.isLoggedIn) {
      showSummary();
    } else {
      showLogin();
    }
  });

  loginButton.addEventListener('click', function() {
    loadingSection.style.display = 'block';
    loginButton.disabled = true;
    
    chrome.runtime.sendMessage({ action: 'login' }, function(response) {
      if (response && response.success) {
        showSummary();
      } else {
        loadingSection.style.display = 'none';
        loginButton.disabled = false;
        alert('Login failed: ' + (response?.error || 'Unknown error'));
      }
    });
  });

  function showLogin() {
    loginSection.style.display = 'block';
    summarySection.style.display = 'none';
    todayCalendarSection.style.display = 'none';
    tomorrowCalendarSection.style.display = 'none';
    loadingSection.style.display = 'none';
  }

  function showSummary() {
    loginSection.style.display = 'none';
    loadingSection.style.display = 'block';
    
    // Get yesterday's and today's dates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();
    
    // Fetch all required data
    Promise.all([
      getBrowserHistory(yesterday),
      getGoogleDriveActivity(yesterday),
      getGmailActivity(yesterday),
      getGmailActivity(today),
      getCalendarEvents()
    ]).then(([history, drive, yesterdayEmails, todayEmails, calendar]) => {
      displaySummary(history, drive, yesterdayEmails, todayEmails, calendar);
      loadingSection.style.display = 'none';
      summarySection.style.display = 'block';
      todayCalendarSection.style.display = 'block';
      tomorrowCalendarSection.style.display = 'block';
    }).catch(error => {
      console.error('Error fetching data:', error);
      loadingSection.style.display = 'none';
      yesterdayContent.innerHTML = `<div class="error">Error loading your summary: ${error.message}</div>`;
      summarySection.style.display = 'block';
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