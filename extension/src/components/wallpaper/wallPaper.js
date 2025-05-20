// Time-based wallpaper changer
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format';
const CONFIG_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format/wallpaper-config.json';
const CURRENT_IMAGE_KEY = 'current_wallpaper';

let wallpaperConfig = null;
const WALLPAPER_SET = 'above_clouds';
let orderedWallpapers = [];
let currentWallpaperIndex = 0;

async function loadConfig() {
    try {
        console.log('Fetching config from:', CONFIG_URL);
        const response = await fetch(CONFIG_URL);
        wallpaperConfig = await response.json();
        console.log('Loaded config:', wallpaperConfig);
        // Create ordered list of wallpapers
        orderedWallpapers = [];
        const timeOrder = ['sunrise', 'day', 'sunset', 'night'];
        
        timeOrder.forEach(period => {
            const periodImages = wallpaperConfig[WALLPAPER_SET][period];
            Object.values(periodImages).forEach(imageName => {
                orderedWallpapers.push(imageName);
            });
        });
        
        console.log('Created ordered wallpaper list:', orderedWallpapers);
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
    console.log('🖼️ [Wallpaper] Update triggered...');
    
    if (!wallpaperConfig) {
        console.log('🔄 [Wallpaper] Config not loaded, loading now...');
        await loadConfig();
    }
    
    const timeOfDay = getTimeOfDay();
    if (!timeOfDay) {
        console.log('⚠️ [Wallpaper] No time of day determined');
        return;
    }
    
    const imageName = getImageForTimeRange(timeOfDay);
    if (!imageName) {
        console.log('⚠️ [Wallpaper] No image selected');
        return;
    }
    
    try {
        console.log(`🖼️ [Wallpaper] Loading image: ${imageName}`);
        const imageData = await getImageFromStorage(imageName);
        
        // Create a new image element to preload
        const newImage = new Image();
        newImage.src = imageData;
        
        // Wait for the new image to load
        await new Promise((resolve) => {
            newImage.onload = resolve;
        });
        
        // Apply the transition
        document.body.style.transition = 'background-image 1s ease-in-out';
        document.body.style.backgroundImage = `url("${imageData}")`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        
        console.log('✅ [Wallpaper] Update completed successfully');
    } catch (error) {
        console.error('❌ [Wallpaper] Failed to update wallpaper:', error);
    }
}

// Function to temporarily switch wallpaper during scroll
export async function switchWallpaperTemporarily(direction) {
    try {
        if (!wallpaperConfig) {
            await loadConfig();
        }
        
        if (orderedWallpapers.length === 0) {
            console.error('No wallpapers available');
            return;
        }
        
        // Update index based on scroll direction
        if (direction === 'forward') {
            currentWallpaperIndex = (currentWallpaperIndex + 1) % orderedWallpapers.length;
        } else {
            currentWallpaperIndex = (currentWallpaperIndex - 1 + orderedWallpapers.length) % orderedWallpapers.length;
        }
        
        const imageName = orderedWallpapers[currentWallpaperIndex];
        console.log(`Switching to wallpaper ${currentWallpaperIndex}: ${imageName}`);
        
        // Fetch and display the image
        const response = await fetch(`${GITHUB_RAW_URL}/${imageName}`);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        // Apply the transition
        document.body.style.transition = 'background-image 0.5s ease-in-out';
        document.body.style.backgroundImage = `url("${base64}")`;
        
        console.log('🖼️ [Wallpaper] Temporary switch completed');
    } catch (error) {
        console.error('❌ [Wallpaper] Failed to switch wallpaper temporarily:', error);
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