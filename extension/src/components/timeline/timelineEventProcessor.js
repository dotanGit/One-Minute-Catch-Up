import { safeGetTimestamp } from '../../utils/dateUtils.js';
import { shouldFilterUrl } from '../../services/browserHistoryService.js';
import { processHistoryEvent } from './timelineBrowserRenderer.js';
import { processDriveEvent } from './timelineDriveRenderer.js';
import { processEmailEvent } from './timelineEmailRenderer.js';
import { processCalendarEvent } from './timelineCalendarRenderer.js';

// Constants
export const SESSION_TIMEOUT = 60 * 60 * 1000;

export function processAllEvents(history, drive, emails, calendar) {
    const processedEvents = [];

    //-----------------------  Process History -----------------------
    if (history?.length > 0) {
        const sortedHistory = history.sort((a, b) => a.lastVisitTime - b.lastVisitTime);
        const sessions = {};

        sortedHistory.forEach(item => {
            if (!item.lastVisitTime || !item.url || shouldFilterUrl(item.url)) return;
            const pattern = extractPattern(item.url);
            const currentTime = item.lastVisitTime;
            processHistoryEvent(item, currentTime, pattern, sessions, processedEvents);
        });
    }

    //-----------------------  Process Drive -----------------------
    if (drive?.files?.length > 0) {
        drive.files.forEach(file => processDriveEvent(file, processedEvents));
    }

    //-----------------------  Process Emails -----------------------
    if (emails?.all || emails?.sent || emails?.received) {
        const emailList = emails.all || [...(emails.sent || []), ...(emails.received || [])];
        emailList.forEach(email => processEmailEvent(email, processedEvents));
    }

    //-----------------------  Process Calendar -----------------------
    if (calendar?.today?.length > 0) {
        calendar.today.forEach(event => processCalendarEvent(event, processedEvents));
    }

    return processedEvents.sort((a, b) => a.timestamp - b.timestamp);
}

export function extractPattern(url) {
    try {
        const parsedUrl = new URL(url);
        const domain = parsedUrl.hostname;
        const parts = domain.split('.');
        if (parts.length >= 3) {
            return parts[parts.length - 3];
        } else if (parts.length >= 2) {
            return parts[0];
        }
        return domain;
    } catch {
        return '';
    }
}

export function getEventCategory(event) {
    if (event.type === 'email') return 'gmail';
    if (event.type === 'calendar') return 'calendar';
    if (event.type === 'drive') return 'drive';
    return 'browser';
}
