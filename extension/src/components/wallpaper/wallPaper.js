// Time-based wallpaper changer
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format';
const CONFIG_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format/wallpaper-config.json';
const CURRENT_IMAGE_KEY = 'current_wallpaper';

let wallpaperConfig = null;
const WALLPAPER_SET = 'above_clouds';
let orderedWallpapers = [];
let currentWallpaperIndex = 0;
let isTemporaryWallpaperActive = false;
let temporaryWallpaperTimeout = null;
let currentMode = 'time-based';  // 'time-based' or 'temporary'

async function loadConfig() {
    try {
        const response = await fetch(CONFIG_URL);
        wallpaperConfig = await response.json();
        
        orderedWallpapers = [];
        const timeOrder = ['sunrise', 'day', 'sunset', 'night'];
        
        timeOrder.forEach(period => {
            const periodImages = wallpaperConfig[WALLPAPER_SET][period];
            Object.values(periodImages).forEach(imageName => {
                orderedWallpapers.push(imageName);
            });
        });
    } catch (error) {
        console.error('Failed to load wallpaper configuration:', error);
    }
}

function getTimeOfDay() {
    if (!wallpaperConfig) return null;
    
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    
    const timePeriods = {
        'sunrise': [6, 10],
        'day': [10, 17],
        'sunset': [17, 21],
        'night': [21, 6]
    };
    
    for (const [period, [start, end]] of Object.entries(timePeriods)) {
        if (start <= end) {
            if (hour >= start && hour < end) {
                return period;
            }
        } else {
            if (hour >= start || hour < end) {
                return period;
            }
        }
    }
    
    return null;
}

function getImageForTimeRange(timeOfDay) {
    if (!wallpaperConfig || !timeOfDay) return null;
    
    const periodImages = wallpaperConfig[WALLPAPER_SET][timeOfDay];
    if (!periodImages) return null;

    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${hour}:${minutes.toString().padStart(2, '0')}`;
    
    for (const [timeRange, imageName] of Object.entries(periodImages)) {
        const [startTime, endTime] = timeRange.split('-');
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        const currentMinutes = hour * 60 + minutes;
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        if (startMinutes > endMinutes) {
            if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
                return imageName;
            }
        } else {
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                return imageName;
            }
        }
    }
    
    return null;
}

async function getImageFromStorage(imageName) {
    try {
        const result = await chrome.storage.local.get(CURRENT_IMAGE_KEY);
        
        if (result[CURRENT_IMAGE_KEY] && result[CURRENT_IMAGE_KEY].name === imageName) {
            return result[CURRENT_IMAGE_KEY].data;
        }
        
        const response = await fetch(`${GITHUB_RAW_URL}/${imageName}`);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        await chrome.storage.local.set({ 
            [CURRENT_IMAGE_KEY]: {
                name: imageName,
                data: base64
            }
        });
        
        return base64;
    } catch (error) {
        console.error('Storage operation failed:', error);
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

// Main function to set wallpaper
async function setWallpaper(imageName) {
    try {
        const response = await fetch(`${GITHUB_RAW_URL}/${imageName}`);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        document.body.style.transition = 'background-image 0.5s ease-in-out';
        document.body.style.backgroundImage = `url("${base64}")`;
    } catch (error) {
        console.error('Failed to set wallpaper:', error);
    }
}

// Time-based wallpaper functions
export async function setTimeBasedWallpaper() {
    currentMode = 'time-based';
    
    const timeOfDay = getTimeOfDay();
    if (!timeOfDay) return;
    
    const imageName = getImageForTimeRange(timeOfDay);
    if (!imageName) return;
    
    await setWallpaper(imageName);
}

// Temporary wallpaper functions
export async function setTemporaryWallpaper(direction) {
    currentMode = 'temporary';
    
    if (!wallpaperConfig) {
        await loadConfig();
    }
    
    if (orderedWallpapers.length === 0) return;
    
    if (direction === 'forward') {
        currentWallpaperIndex = (currentWallpaperIndex + 1) % orderedWallpapers.length;
    } else {
        currentWallpaperIndex = (currentWallpaperIndex - 1 + orderedWallpapers.length) % orderedWallpapers.length;
    }
    
    const imageName = orderedWallpapers[currentWallpaperIndex];
    await setWallpaper(imageName);
}

// Public API
export async function updateWallpaper() {
    if (currentMode === 'temporary') return;
    await setTimeBasedWallpaper();
}

export async function switchWallpaperTemporarily(direction) {
    await setTemporaryWallpaper(direction);
}

export function forceResetToTimeBasedWallpaper() {
    currentWallpaperIndex = 0;
    currentMode = 'time-based';
    setTimeBasedWallpaper();
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

// Add this new function
export function resetWallpaperIndex() {
    currentWallpaperIndex = 0;
}

// In the scroll handler, add logging
function handleScroll() {
    if (isScrollingToLatest) {
        console.log('⏭️ [Scroll] Skipping - scrolling to latest');
        return;
    }
    
    const currentScroll = container.scrollLeft;
    const scrollDelta = Math.abs(currentScroll - lastScrollPosition);
    const direction = currentScroll > lastScrollPosition ? 'forward' : 'backward';
    
    console.log(`📜 [Scroll] Delta: ${scrollDelta}, Direction: ${direction}, Last Position: ${lastScrollPosition}, Current: ${currentScroll}`);
    
    if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer);
    }
    
    scrollDebounceTimer = setTimeout(() => {
        if (scrollDelta >= SCROLL_THRESHOLD) {
            lastScrollPosition = currentScroll;
            console.log(`🎯 [Scroll] Threshold reached, switching wallpaper (direction: ${direction})`);
            import('../wallpaper/wallPaper.js').then(module => {
                module.switchWallpaperTemporarily(direction);
            });
        }
    }, DEBOUNCE_DELAY);
}