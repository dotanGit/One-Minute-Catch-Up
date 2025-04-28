import { shouldFilterUrl } from '../../services/browserHistoryService.js';
import { normalizeTimestamp } from '../../utils/dateUtils.js';


// Constants
export const SESSION_TIMEOUT = 60 * 60 * 1000;

export function processAllEvents(history, drive, emails, calendar, downloads) {
    const processedEvents = [];

    //-----------------------  Process History -----------------------
    if (history?.length > 0) {
        const sortedHistory = history.sort((a, b) => a.lastVisitTime - b.lastVisitTime);
      
        sortedHistory.forEach(item => {
            if (!item.lastVisitTime || !item.url || shouldFilterUrl(item.url)) return;
            if (item.url.startsWith('chrome://downloads')) return;
            
            processedEvents.push({
                type: 'browser',
                timestamp: normalizeTimestamp(item.lastVisitTime),
                title: 'Browser Visit',
                actualTitle: item.title,
                url: item.url,
                id: item.id
            });
        });
    }

    //-----------------------  Process Downloads -----------------------
    if (downloads?.length > 0) {
        downloads.forEach(download => {
            processedEvents.push({
                type: 'download',
                timestamp: normalizeTimestamp(download.startTime),
                title: 'Download',
                actualTitle: download.filename.split('\\').pop().split('/').pop(),
                downloadUrl: download.finalUrl || download.url,
                id: download.id
            });
        });
    }

    //-----------------------  Process Drive -----------------------
    if (drive?.files?.length > 0) {
        drive.files.forEach(file => {
            if (file.modifiedTime) {
                const timestamp = normalizeTimestamp(file.modifiedTime);
                if (timestamp > 0) {
                    processedEvents.push({
                        type: 'drive',
                        timestamp,
                        title: 'Drive File Edit',
                        description: file.name,
                        webViewLink: file.webViewLink,
                        id: file.id
                    });
                }
            }
        });
    }

    //-----------------------  Process Emails -----------------------
    if (emails?.all || emails?.sent || emails?.received) {
        const emailList = emails.all || [...(emails.sent || []), ...(emails.received || [])];
        emailList.forEach(email => {
            if (email.timestamp) {
                processedEvents.push({
                    type: 'email',
                    timestamp: normalizeTimestamp(email.timestamp),
                    title: email.type === 'sent' ? 'Email Sent' : 'Email Received',
                    subject: email.subject || 'No subject',
                    emailUrl: email.threadId ? 
                        `https://mail.google.com/mail/u/0/#inbox/${email.threadId}` : null,
                    id: email.id
                });
            }
        });
    }

    //-----------------------  Process Calendar -----------------------
    if (calendar?.today?.length > 0) {
        calendar.today.forEach(event => {
            const eventTime = event.start?.dateTime || event.start?.date;
            if (eventTime) {
                const timestamp = normalizeTimestamp(eventTime);
                if (timestamp > 0) {
                    processedEvents.push({
                        type: 'calendar',
                        timestamp,
                        title: 'Calendar Event',
                        description: event.summary || 'Untitled event',
                        eventUrl: event.htmlLink,
                        id: event.id
                    });
                }
            }
        });
    }

    return processedEvents;
}

export function cleanDownloadUrl(url) {
    try {
        // Remove /download and any query parameters
        return url.split('/download')[0];
    } catch {
        return url;
    }
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
    if (event.type === 'download') return 'download';
    return 'browser';
}
