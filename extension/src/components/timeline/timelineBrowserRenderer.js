import { SESSION_TIMEOUT } from './timelineEventProcessor.js';

export function processHistoryEvent(item, currentTime, pattern, sessions, processedEvents) {
    if (!sessions[pattern]) {
        // New session
        sessions[pattern] = { 
            start: currentTime, 
            end: currentTime 
        };
        processedEvents.push({
            type: 'browser',
            timestamp: currentTime,
            title: 'Browser Visit',
            actualTitle: item.title,
            description: item.url,
            url: item.url,
            duration: 0
        });
        return;
    }

    const session = sessions[pattern];
    const timeSinceLast = currentTime - session.end;

    if (timeSinceLast < SESSION_TIMEOUT) {
        // Update existing session
        sessions[pattern].end = currentTime;
        const duration = Math.floor((currentTime - session.start) / 60000);
        const lastEvent = processedEvents.find(e => 
            e.type === 'browser' && e.url === item.url
        );
        if (lastEvent) {
            lastEvent.duration = duration;
        }
    } else {
        // Start new session
        sessions[pattern] = { 
            start: currentTime, 
            end: currentTime 
        };
        processedEvents.push({
            type: 'browser',
            timestamp: currentTime,
            title: 'Browser Visit',
            actualTitle: item.title,
            description: item.url,
            url: item.url,
            duration: 0
        });
    }
}