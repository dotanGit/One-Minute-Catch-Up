// ===== Imports =====
import { normalizeDateToStartOfDay, safeParseDate, safeGetTimestamp } from '../../utils/dateUtils.js';
import { buildTimeline, prependTimeline } from './timelineRenderer.js';
import { getDownloadsService } from '../../services/downloadService.js';
import { processAllEvents } from './timelineEventProcessor.js';
import { normalizeTimestamp } from '../../utils/dateUtils.js';

// ===== Global Variables =====
const loadingSection = document.getElementById('loading');
const timelineEvents = document.getElementById('timeline-events');
const timelineWrapper = document.querySelector('.timeline-wrapper');
window.globalStartTime = null;

export let currentDate = normalizeDateToStartOfDay(new Date());
let oldestLoadedDate = new Date(currentDate);
let isLoadingMorePastDays = false;

// ===== Date Functions =====
function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

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
    const timelineDate = document.querySelector('.timeline-date');
    if (timelineDate) {
        timelineDate.textContent = formatDate(currentDate);
    }
}

// ===== API Functions =====
function getBrowserHistory(date) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
            action: 'getBrowserHistory', 
            date: date.toISOString()
        }, function(response) {
            resolve(response || []);
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

function getCalendarEvents(date) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
            action: 'getCalendarEvents',
            date: date.toISOString()
        }, function(response) {
            resolve(response || { today: [], tomorrow: [] });
        });
    });
}

// ===== Cache Logic =====
const timelineCache = {
    data: new Map(),
    maxEntries: 7,
    
    get(dateKey) {
        return this.data.get(dateKey);
    },
    
    set(dateKey, data) {
        if (this.data.size >= this.maxEntries) {
            const oldestKey = this.data.keys().next().value;
            this.data.delete(oldestKey);
        }
        this.data.set(dateKey, {
            timestamp: Date.now(),
            data: data
        });
    },

    isValid(dateKey) {
        const entry = this.data.get(dateKey);
        if (!entry) return false;
        const age = Date.now() - entry.timestamp;
        return age < 30 * 60 * 1000;
    }
};

// ===== Timeline Functions =====
export function showTimeline() {
    const loginSection = document.getElementById('login-section');
    if (loginSection) loginSection.style.display = 'none';
    if (loadingSection) loadingSection.style.display = 'none';
    if (timelineWrapper) timelineWrapper.style.display = 'block';
}

export async function initTimeline() {
    updateTimelineDate();
    try {
        const datesToLoad = [];
        const today = new Date(currentDate);
        for (let i = 0; i < 1; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            datesToLoad.push(safeParseDate(date));
        }

        const allData = await Promise.all(datesToLoad.map(date => 
            Promise.all([
                getBrowserHistory(date),
                getGoogleDriveActivity(date),
                getGmailActivity(date),
                getCalendarEvents(date),
                getDownloadsService(date)
            ]).then(([history, drive, emails, calendar, downloads]) => ({
                date,
                history,
                drive,
                emails,
                calendar,
                downloads
            }))
        ));

        const mergedData = {
            history: allData.flatMap(data => data.history),
            drive: { files: allData.flatMap(data => data.drive.files) },
            emails: { all: allData.flatMap(data => data.emails.all || []) },
            calendar: { today: allData.flatMap(data => data.calendar.today || []) },
            downloads: allData.flatMap(data => data.downloads || [])
        };

        const allTimestamps = [
            ...mergedData.history.map(item => item.lastVisitTime),
            ...mergedData.drive.files.map(file => new Date(file.modifiedTime).getTime()),
            ...(mergedData.emails.all?.map(email => Number(email.timestamp)) || []),
            ...(mergedData.calendar.today?.map(event => safeGetTimestamp(event.start?.dateTime || event.start?.date)) || []),
            ...mergedData.downloads.map(download => download.startTime)
        ].filter(Boolean);

        window.globalStartTime = Math.min(...allTimestamps);

        if (timelineWrapper) timelineWrapper.style.visibility = 'hidden';

        console.log('=== Initial Load Events ===');

        const initialEvents = [
            ...mergedData.history.map(item => ['Browser', item.title, normalizeTimestamp(item.lastVisitTime)]),
            ...mergedData.drive.files.map(file => ['Drive', file.name, normalizeTimestamp(file.modifiedTime)]),
            ...(mergedData.emails.all || []).map(email => ['Email', email.subject, normalizeTimestamp(email.timestamp)]),
            ...(mergedData.calendar.today || []).map(event => ['Calendar', event.summary, normalizeTimestamp(event.start?.dateTime || event.start?.date)]),
            ...mergedData.downloads.map(download => ['Download', download.filename, normalizeTimestamp(download.startTime)]),
        ];
        
        initialEvents
            .sort((a, b) => a[2] - b[2])
            .forEach(([type, title, timestamp]) => {
                const date = new Date(timestamp);
                const dateString = date.toISOString().split('T')[0];
                const timeString = date.toISOString().split('T')[1].split('.')[0]; // hh:mm:ss
                console.log(`${dateString} | ${timeString} | ${type} | ${title}`);
            });
        
        
        

        buildTimeline(mergedData.history, mergedData.drive, mergedData.emails, mergedData.calendar, mergedData.downloads);

        const container = document.querySelector('.timeline-container');
        if (container) {
            container.scrollLeft = container.scrollWidth;
        }

        if (timelineWrapper) {
            timelineWrapper.style.visibility = 'visible';
        }
    } catch (error) {
        console.error('Error initializing timeline:', error);
        if (timelineEvents) {
            timelineEvents.innerHTML = '<div class="error">Error loading timeline data</div>';
        }
    }
}

async function loadAndPrependTimelineData(date) {

    date = new Date(date); 
    date.setUTCHours(0, 0, 0, 0); 

    const dateKey = getDateKey(date);
    try {
        // Log the date we're trying to fetch
        console.log('Fetching events for date:', date.toISOString());
        
        // Get current leftmost event timestamp for comparison
        const timelineEvents = document.getElementById('timeline-events');
        const existingEvents = timelineEvents.querySelectorAll('.timeline-event');
        const leftmostEvent = existingEvents[0];
        
        let cachedData;
        if (timelineCache.isValid(dateKey)) {
            console.log('Using cached data for:', dateKey);
            cachedData = timelineCache.get(dateKey);
        } else {
            console.log('Fetching new data for:', dateKey);
            const normalizedDate = safeParseDate(date);
            const [history, drive, emails, calendar, downloads] = await Promise.all([
                getBrowserHistory(normalizedDate),
                getGoogleDriveActivity(normalizedDate),
                getGmailActivity(normalizedDate),
                getCalendarEvents(normalizedDate),
                getDownloadsService(normalizedDate)
            ]);

            console.log('RAW data counts:', {
                history: history.length,
                drive: drive.files.length,
                emailsAll: emails.all?.length || 0,
                emailsSent: emails.sent?.length || 0,
                emailsReceived: emails.received?.length || 0,
                calendarToday: calendar.today.length,
                calendarTomorrow: calendar.tomorrow.length,
                downloads: downloads.length
            });
            

            cachedData = { data: { history, drive, emails, calendar, downloads } };
            timelineCache.set(dateKey, cachedData.data);
        }

        const { history, drive, emails, calendar, downloads } = cachedData.data;

        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        
        
        function isInRange(timestamp) {
            const normalized = normalizeTimestamp(timestamp);
            return normalized >= startOfDay.getTime() && normalized <= endOfDay.getTime();
        }
        
        function isCalendarEventValid(event) {
            const hasDate = !!event.start?.date;
            const hasDateTime = !!event.start?.dateTime;
        
            // If it's a full-day event, skip it
            const isFullDayEvent = hasDate && (!hasDateTime || new Date(event.start.dateTime).getUTCHours() === 0 && new Date(event.start.dateTime).getUTCMinutes() === 0);
            if (isFullDayEvent) return false;

            const eventTime = normalizeTimestamp(event.start?.dateTime || event.start?.date);
            return isInRange(eventTime);
        }
        
        // Apply filters
        const filteredHistory = history.filter(item => isInRange(item.lastVisitTime));
        const filteredDrive = drive.files.filter(file => isInRange(new Date(file.modifiedTime).getTime()));
        const filteredEmails = emails.all?.filter(email => isInRange(Number(email.timestamp))) || [];
        const filteredCalendarToday = calendar.today?.filter(isCalendarEventValid) || [];
        const filteredCalendarTomorrow = calendar.tomorrow?.filter(isCalendarEventValid) || [];
        const filteredDownloads = downloads?.filter(download => isInRange(download.startTime)) || [];
        
        // Prepare final filtered calendar object
        const filteredCalendar = {
            today: filteredCalendarToday,
            tomorrow: filteredCalendarTomorrow
        };
        
        // Debug check (optional, good!)
        console.log('Filtered data counts:', {
            history: filteredHistory.length,
            drive: filteredDrive.length,
            emails: filteredEmails.length,
            calendarToday: filteredCalendarToday.length,
            calendarTomorrow: filteredCalendarTomorrow.length,
            downloads: filteredDownloads.length
        });
        
        const hasData = 
            (history?.length > 0) ||
            (drive?.files?.length > 0) ||
            (emails?.all?.length > 0) ||
            (calendar?.today?.length > 0) ||
            (downloads?.length > 0);

            console.log('=== Prepend Events ===');

            const prependEvents = [
                ...filteredHistory.map(item => ['Browser', item.title, normalizeTimestamp(item.lastVisitTime)]),
                ...filteredDrive.map(file => ['Drive', file.name, normalizeTimestamp(file.modifiedTime)]),
                ...filteredEmails.map(email => ['Email', email.subject, normalizeTimestamp(email.timestamp)]),
                ...filteredCalendar.today.map(event => ['Calendar', event.summary, normalizeTimestamp(event.start?.dateTime || event.start?.date)]),
                ...filteredDownloads.map(download => ['Download', download.filename, normalizeTimestamp(download.startTime)]),
            ];
            
            prependEvents
                .sort((a, b) => a[2] - b[2])
                .forEach(([type, title, timestamp]) => {
                    const date = new Date(timestamp);
                    const dateString = date.toISOString().split('T')[0];
                    const timeString = date.toISOString().split('T')[1].split('.')[0]; // hh:mm:ss
                    console.log(`${dateString} | ${timeString} | ${type} | ${title}`);
                });
            
            
            

        if (hasData) {
            prependTimeline(filteredHistory, { files: filteredDrive }, { all: filteredEmails }, filteredCalendar, filteredDownloads);
            const newOldestLoadedDate = new Date(startOfDay);
            newOldestLoadedDate.setUTCDate(newOldestLoadedDate.getUTCDate() - 1);
            oldestLoadedDate = newOldestLoadedDate;

            console.log('✅ Clean Updated oldestLoadedDate to:', oldestLoadedDate.toISOString());
        } else {
            console.log('No data found for date:', dateKey);
        }
    } catch (error) {
        console.error('Error loading timeline data:', error);
    }
}

// ===== Scroll Control =====
const container = document.querySelector('.timeline-container');
const scrollSpeed = 10;
let scrollInterval = null;
document.getElementById('scroll-left').addEventListener('mouseenter', () => startScroll(-1));
document.getElementById('scroll-left').addEventListener('mouseleave', stopScroll);
document.getElementById('scroll-right').addEventListener('mouseenter', () => startScroll(1));
document.getElementById('scroll-right').addEventListener('mouseleave', stopScroll);

// Add Latest button functionality with smooth scroll
document.getElementById('scroll-latest').addEventListener('click', () => {
    const container = document.querySelector('.timeline-container');
    if (container) {
        // Temporarily enable smooth scrolling
        container.style.scrollBehavior = 'smooth';
        
        // Scroll to the end
        container.scrollLeft = container.scrollWidth;
        
        // Reset to default (instant) scrolling after animation
        setTimeout(() => {
            container.style.scrollBehavior = 'auto';
        }, 500); // Match this with your desired scroll duration
    }
});

function startScroll(direction) {
    stopScroll();
    scrollInterval = setInterval(() => {
        const isRTL = getComputedStyle(container).direction === 'rtl';
        const scrollAmount = scrollSpeed * (isRTL ? -1 : 1) * direction;
        container.scrollLeft += scrollAmount;
    }, 16);
}

function stopScroll() {
    if (scrollInterval !== null) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        container.scrollLeft = container.scrollLeft;
    }
}

container.addEventListener('scroll', () => {
    if (container.scrollLeft < 600 && !isLoadingMorePastDays) {
        isLoadingMorePastDays = true;

        console.log('Oldest loaded date BEFORE subtracting:', oldestLoadedDate.toISOString());
        const previousDate = new Date(oldestLoadedDate);
        previousDate.setUTCHours(0, 0, 0, 0); // ✅ force UTC midnight
        console.log('Fetching data for:', previousDate.toISOString());

        loadAndPrependTimelineData(previousDate)
            .finally(() => {
                isLoadingMorePastDays = false;
            });
    }
});

