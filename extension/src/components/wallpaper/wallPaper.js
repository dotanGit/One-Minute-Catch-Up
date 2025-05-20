// Time-based wallpaper changer
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format';
const CONFIG_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format/wallpaper-config.json';
const CURRENT_IMAGE_KEY = 'current_wallpaper';

let wallpaperConfig = null;
const WALLPAPER_SET = 'above_clouds';


async function loadConfig() {
    try {
        console.log('Fetching config from:', CONFIG_URL);
        const response = await fetch(CONFIG_URL);
        wallpaperConfig = await response.json();
        console.log('Loaded config:', wallpaperConfig);
    } catch (error) {
        console.error('Failed to load wallpaper configuration:', error);
    }
}

function getTimeOfDay() {
    if (!wallpaperConfig) {
        console.log('Config not loaded');
        return null;
    }
    
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    console.log('Current time:', `${hour}:${minutes.toString().padStart(2, '0')}`);
    
    // Define time periods and their ranges
    const timePeriods = {
        'sunrise': [6, 10],
        'day': [10, 17],
        'sunset': [17, 21],
        'night': [21, 6]
    };
    
    // Determine the current period
    for (const [period, [start, end]] of Object.entries(timePeriods)) {
        if (start <= end) {
            if (hour >= start && hour < end) {
                return period;
            }
        } else {
            // Handle wrapping periods (like night: 21-6)
            if (hour >= start || hour < end) {
                return period;
            }
        }
    }
    
    console.log('No matching time period found');
    return null;
}

function getImageForTimeRange(timeOfDay) {
    if (!wallpaperConfig || !timeOfDay) {
        console.log('Cannot get image - missing config or time of day');
        return null;
    }
    
    const periodImages = wallpaperConfig[WALLPAPER_SET][timeOfDay];
    if (!periodImages) {
        console.log('No images found for period:', timeOfDay);
        return null;
    }

    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${hour}:${minutes.toString().padStart(2, '0')}`;
    console.log('Current time:', currentTime);
    
    // Find the matching time range
    for (const [timeRange, imageName] of Object.entries(periodImages)) {
        const [startTime, endTime] = timeRange.split('-');
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        // Convert current time to minutes since midnight for easier comparison
        const currentMinutes = hour * 60 + minutes;
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        // Handle wrapping ranges (like 23:30-0:00)
        if (startMinutes > endMinutes) {
            if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
                console.log('Selected image for time range', timeRange, ':', imageName);
                return imageName;
            }
        } else {
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                console.log('Selected image for time range', timeRange, ':', imageName);
                return imageName;
            }
        }
    }
    
    console.log('No matching time range found');
    return null;
}

async function getImageFromStorage(imageName) {
    try {
        // Get the current stored image
        const result = await chrome.storage.local.get(CURRENT_IMAGE_KEY);
        
        // If we already have this image stored, use it
        if (result[CURRENT_IMAGE_KEY] && result[CURRENT_IMAGE_KEY].name === imageName) {
            console.log('Using cached image:', imageName);
            return result[CURRENT_IMAGE_KEY].data;
        }
        
        // If not, fetch the new image
        console.log('Fetching new image:', imageName);
        const response = await fetch(`${GITHUB_RAW_URL}/${imageName}`);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        // Store only the current image
        await chrome.storage.local.set({ 
            [CURRENT_IMAGE_KEY]: {
                name: imageName,
                data: base64
            }
        });
        
        return base64;
    } catch (error) {
        console.error('Storage operation failed:', error);
        // Fallback to direct fetch if storage fails
        const response = await fetch(`${GITHUB_RAW_URL}/${imageName}`);
        const blob = await response.blob();
        return blobToBase64(blob);
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}


export async function updateWallpaper() {
    console.log('Updating wallpaper...');
    
    if (!wallpaperConfig) {
        console.log('Config not loaded, loading now...');
        await loadConfig();
    }
    
    const timeOfDay = getTimeOfDay();
    if (!timeOfDay) {
        console.log('No time of day determined');
        return;
    }
    
    const imageName = getImageForTimeRange(timeOfDay);
    if (!imageName) {
        console.log('No image selected');
        return;
    }
    
    try {
        const imageData = await getImageFromStorage(imageName);
        document.body.style.backgroundImage = `url("${imageData}")`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
    } catch (error) {
        console.error('Failed to update wallpaper:', error);
    }
}

// Listen for update messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateWallpaper') {
        updateWallpaper();
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', async function() {
    loadConfig().then(() => {
        updateWallpaper();
    });
});