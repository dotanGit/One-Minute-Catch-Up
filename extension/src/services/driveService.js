import { getAuthToken } from '../utils/auth.js';

export async function getDriveActivity(date) {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&q=modifiedTime >= '${startTime.toISOString()}' and modifiedTime <= '${endTime.toISOString()}'`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        throw new Error('Authentication expired. Please try again.');
      }
      throw new Error(`Drive API error: ${response.status}`);
    }

    const data = await response.json();
    return { files: data.files || [] };
  } catch (error) {
    console.error('Drive activity error:', error);
    return { files: [], error: error.message };
  }
}