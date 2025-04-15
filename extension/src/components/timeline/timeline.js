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
    maxEntries: 7,
    
    async get(dateKey) {
        try {
            const result = await chrome.storage.local.get(dateKey);
            return result[dateKey];
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    },
    
    async set(dateKey, data) {
        try {
            // Get all keys to manage maxEntries
            const allKeys = await chrome.storage.local.get(null);
            const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith('timeline_'));
            
            // Remove oldest entries if we exceed maxEntries
            if (cacheKeys.length >= this.maxEntries) {
                const oldestKeys = cacheKeys
                    .sort()
                    .slice(0, cacheKeys.length - this.maxEntries + 1);
                await chrome.storage.local.remove(oldestKeys);
            }

            // Save new data
            await chrome.storage.local.set({
                [dateKey]: {
                    timestamp: Date.now(),
                    data: data,
                    date: dateKey.split('_')[1] // Store the date for comparison
                }
            });
        } catch (error) {
            console.error('Cache write error:', error);
        }
    },

    async isValid(dateKey) {
        try {
            const entry = await this.get(dateKey);
            if (!entry) return false;

            // Get the date from the cache key
            const cacheDate = new Date(entry.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // If it's a previous day, cache is always valid
            if (cacheDate < today) {
                console.log('📦 Previous day - using permanent cache');
                return true;
            }

            // For today, use 30-minute cache
            const age = Date.now() - entry.timestamp;
            const isValid = age < 30 * 60 * 1000;
            console.log(`📅 Today's data - cache ${isValid ? 'valid' : 'expired'} (age: ${Math.round(age/1000/60)} minutes)`);
            return isValid;

        } catch (error) {
            console.error('Cache validation error:', error);
            return false;
        }
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

        const allData = await Promise.all(datesToLoad.map(async date => {
            const dateKey = `timeline_${getDateKey(date)}`;
            const isToday = date.toDateString() === new Date().toDateString();
            
            // For today, always fetch fresh data on initial load
            if (isToday) {
                console.log('📅 Today - fetching fresh data');
                const [history, drive, emails, calendar, downloads] = await Promise.all([
                    getBrowserHistory(date),
                    getGoogleDriveActivity(date),
                    getGmailActivity(date),
                    getCalendarEvents(date),
                    getDownloadsService(date)
                ]);

                const data = { history, drive, emails, calendar, downloads };
                // Cache today's data for subsequent visits
                await timelineCache.set(dateKey, data);
                return { date, ...data };
            }

            // For non-today, check cache first
            const isValidCache = await timelineCache.isValid(dateKey);
            if (isValidCache) {
                console.log('📦 Using cached data for:', dateKey);
                const cachedData = await timelineCache.get(dateKey);
                return { date, ...cachedData.data };
            }

            // If no valid cache, fetch fresh
            const [history, drive, emails, calendar, downloads] = await Promise.all([
                getBrowserHistory(date),
                getGoogleDriveActivity(date),
                getGmailActivity(date),
                getCalendarEvents(date),
                getDownloadsService(date)
            ]);

            const data = { history, drive, emails, calendar, downloads };
            await timelineCache.set(dateKey, data);
            return { date, ...data };
        }));

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

    const dateKey = `timeline_${getDateKey(date)}`;
    try {
        console.log('🔍 Checking data for date:', date.toISOString());
        
        // Check cache first for previous days
        let data;
        const isValidCache = await timelineCache.isValid(dateKey);
        
        console.log('====== DATA SOURCE CHECK ======');
        console.log('Date:', date.toISOString());
        console.log('Cache exists?:', isValidCache);
        
        if (isValidCache) {
            console.log('✅ USING CACHED DATA');
            console.log('Cache key:', dateKey);
            const cachedData = await timelineCache.get(dateKey);
            data = cachedData.data;
            
            // Log cache contents
            console.log('Cache contents summary:', {
                history: data.history?.length || 0,
                drive: data.drive?.files?.length || 0,
                emails: data.emails?.all?.length || 0,
                calendar: data.calendar?.today?.length || 0,
                downloads: data.downloads?.length || 0
            });
        } else {
            console.log('❌ NO VALID CACHE - FETCHING FROM APIs');
            console.time('API Calls Duration');
            
            const [history, drive, emails, calendar, downloads] = await Promise.all([
                getBrowserHistory(date),
                getGoogleDriveActivity(date),
                getGmailActivity(date),
                getCalendarEvents(date),
                getDownloadsService(date)
            ]);

            console.timeEnd('API Calls Duration');

            data = { history, drive, emails, calendar, downloads };
            
            // Log API response summary
            console.log('API response summary:', {
                history: history?.length || 0,
                drive: drive?.files?.length || 0,
                emails: emails?.all?.length || 0,
                calendar: calendar?.today?.length || 0,
                downloads: downloads?.length || 0
            });
            
            // Save to cache
            await timelineCache.set(dateKey, data);
            console.log('💾 Saved to cache with key:', dateKey);
        }
        console.log('==============================');

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
        
        // Apply filters using data from cache or fresh fetch
        const filteredHistory = data.history.filter(item => isInRange(item.lastVisitTime));
        const filteredDrive = data.drive.files.filter(file => isInRange(new Date(file.modifiedTime).getTime()));
        const filteredEmails = data.emails.all?.filter(email => isInRange(Number(email.timestamp))) || [];
        const filteredCalendarToday = data.calendar.today?.filter(isCalendarEventValid) || [];
        const filteredCalendarTomorrow = data.calendar.tomorrow?.filter(isCalendarEventValid) || [];
        const filteredDownloads = data.downloads?.filter(download => isInRange(download.startTime)) || [];
        
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
            (data.history?.length > 0) ||
            (data.drive?.files?.length > 0) ||
            (data.emails?.all?.length > 0) ||
            (data.calendar?.today?.length > 0) ||
            (data.downloads?.length > 0);

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
            prependTimeline(
                filteredHistory, 
                { files: filteredDrive }, 
                { all: filteredEmails }, 
                { today: filteredCalendarToday, tomorrow: filteredCalendarTomorrow }, 
                filteredDownloads
            );
            
            const newOldestLoadedDate = new Date(startOfDay);
            newOldestLoadedDate.setUTCDate(newOldestLoadedDate.getUTCDate() - 1);
            oldestLoadedDate = newOldestLoadedDate;

            console.log('✅ Updated oldestLoadedDate to:', oldestLoadedDate.toISOString());
        } else {
            console.log('No data found for date:', dateKey);
        }
    } catch (error) {
        console.error('Error loading timeline data:', error);
    }
}


// ===== Scroll Control =====
const container = document.querySelector('.timeline-container');
const scrollSpeed = 1;
let isHoveringLeft = false;
let isHoveringRight = false;


document.getElementById('scroll-left').addEventListener('mouseenter', () => {
    isHoveringLeft = true;
    startScroll(-1);
});
document.getElementById('scroll-left').addEventListener('mouseleave', () => {
    isHoveringLeft = false;
    stopScroll();
});

document.getElementById('scroll-right').addEventListener('mouseenter', () => {
    isHoveringRight = true;
    startScroll(1);
});
document.getElementById('scroll-right').addEventListener('mouseleave', () => {
    isHoveringRight = false;
    stopScroll();
});


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

let scrollAnimationFrame = null;

function startScroll(direction) {
    stopScroll(); // clear existing animation
    const isRTL = getComputedStyle(container).direction === 'rtl';
    const scrollAmount = scrollSpeed * (isRTL ? -1 : 1) * direction;

    function scrollStep() {
        container.scrollLeft += scrollAmount;
        scrollAnimationFrame = requestAnimationFrame(scrollStep);
    }

    scrollStep();
}

function stopScroll() {
    if (scrollAnimationFrame !== null) {
        cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
    }
}


const scrollAmountOnClick = 1000; // AMOUNT OF SCROLL ON CLICK

document.getElementById('scroll-left').addEventListener('click', () => {
    stopScroll();
    container.scrollBy({ left: -scrollAmountOnClick, behavior: 'smooth' });
    setTimeout(() => {
        if (isHoveringLeft) {
            startScroll(-1);
        }
    }, 400); // give it time to finish
});

document.getElementById('scroll-right').addEventListener('click', () => {
    stopScroll();
    container.scrollBy({ left: scrollAmountOnClick, behavior: 'smooth' });
    setTimeout(() => {
        if (isHoveringRight) {
            startScroll(1);
        }
    }, 400);
});
;

container.addEventListener('scroll', () => {
    if (container.scrollLeft < 1500 && !isLoadingMorePastDays) {
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

