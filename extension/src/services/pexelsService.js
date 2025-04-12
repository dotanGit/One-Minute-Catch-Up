const PEXELS_API_KEY = 'EUSqjMx0vbncQV2FGSbGBzotPiCrfqeOrmuvHwnKTey59ml17JlIsIdn'; // Replace with your Pexels API key

export async function getImageById(id) {
    try {
        // Try to get from cache first
        const cachedData = await chrome.storage.local.get(`wallpaper_${id}`);
        if (cachedData[`wallpaper_${id}`]) {
            return cachedData[`wallpaper_${id}`];
        }

        // If not in cache, fetch from API
        const response = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
            headers: {
                'Authorization': PEXELS_API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }
        
        const data = await response.json();
        const imageUrl = data.src.original;

        // Cache the URL
        await chrome.storage.local.set({ [`wallpaper_${id}`]: imageUrl });
        
        return imageUrl;
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
} 