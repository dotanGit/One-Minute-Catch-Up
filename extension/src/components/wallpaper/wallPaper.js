// Time-based wallpaper changer
document.addEventListener('DOMContentLoaded', function() {
    const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format';
    const CONFIG_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format/config_above_clouds.json';
    
    let wallpaperConfig = null;
    let currentWallpaperSet = null;

    async function loadConfig() {
        try {
            console.log('Fetching config from:', CONFIG_URL);
            const response = await fetch(CONFIG_URL);
            wallpaperConfig = await response.json();
            console.log('Loaded config:', wallpaperConfig);
            currentWallpaperSet = wallpaperConfig.defaultSet;
            console.log('Current wallpaper set:', currentWallpaperSet);
        } catch (error) {
            console.error('Failed to load wallpaper configuration:', error);
        }
    }

    function getTimeOfDay() {
        if (!wallpaperConfig || !currentWallpaperSet) {
            console.log('Config or wallpaper set not loaded');
            return null;
        }
        
        const hour = new Date().getHours();
        console.log('Current hour:', hour);
        const timeRanges = wallpaperConfig.wallpaperSets[currentWallpaperSet].timeRanges;
        
        // Check each time range
        for (const [period, range] of Object.entries(timeRanges)) {
            if (range.start <= range.end) {
                // Normal range (e.g., 8-17)
                if (hour >= range.start && hour < range.end) {
                    console.log('Selected time period:', period);
                    return period;
                }
            } else {
                // Wrapping range (e.g., 20-5)
                if (hour >= range.start || hour < range.end) {
                    console.log('Selected time period:', period);
                    return period;
                }
            }
        }
        console.log('No matching time period found');
        return null;
    }

    function getRandomImage(timeOfDay) {
        if (!wallpaperConfig || !currentWallpaperSet || !timeOfDay) {
            console.log('Cannot get random image - missing config, set, or time of day');
            return null;
        }
        
        const images = wallpaperConfig.wallpaperSets[currentWallpaperSet].timeRanges[timeOfDay].images;
        console.log('Available images for', timeOfDay, ':', images);
        const randomIndex = Math.floor(Math.random() * images.length);
        const selectedImage = images[randomIndex];
        console.log('Selected image:', selectedImage);
        return selectedImage;
    }

    async function updateWallpaper() {
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
        
        const imageName = getRandomImage(timeOfDay);
        if (!imageName) {
            console.log('No image selected');
            return;
        }
        
        const imageUrl = `${GITHUB_RAW_URL}/${imageName}`;
        console.log('Final image URL:', imageUrl);
        
        document.body.style.backgroundImage = `url("${imageUrl}")`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
    }

    // Load config and update wallpaper immediately
    loadConfig().then(() => {
        updateWallpaper();
        // Update wallpaper every hour
        setInterval(updateWallpaper, 3600000);
    });
});