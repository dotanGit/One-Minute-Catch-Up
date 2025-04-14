import { safeGetTimestamp } from '../../utils/dateUtils.js';
import { normalizeTimestamp } from '../../utils/dateUtils.js';


export function processDriveEvent(file, processedEvents) {
    if (file.modifiedTime) {
        const timestamp = normalizeTimestamp(file.modifiedTime);
        if (timestamp > 0) {
            processedEvents.push({
                type: 'drive',
                timestamp,
                title: 'Drive File Edit',
                description: file.name,
                webViewLink: file.webViewLink,
            });
        }
    }
}
