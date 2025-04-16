import { getAuthToken } from '../utils/auth.js';
import { normalizeDateToStartOfDay, safeToISOString } from '../utils/dateUtils.js';

export async function getDriveActivity(date) {
    try {
        const token = await getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const startTime = normalizeDateToStartOfDay(date);
        const endTime = new Date(startTime);
        endTime.setUTCHours(23, 59, 59, 999);

        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&q=modifiedTime >= '${safeToISOString(startTime)}' and modifiedTime <= '${safeToISOString(endTime)}'`,
          {
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
              },
          }
        );

        const data = await response.json();
        return { files: data.files || [] };
    } catch (error) {
        return { files: [], error: error.message };
    }
}
