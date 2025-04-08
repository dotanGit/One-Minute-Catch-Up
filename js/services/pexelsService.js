const PEXELS_API_KEY = 'EUSqjMx0vbncQV2FGSbGBzotPiCrfqeOrmuvHwnKTey59ml17JlIsIdn'; // Replace with your Pexels API key

export async function getImageById(id) {
    try {
        const response = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
            headers: {
                'Authorization': PEXELS_API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }
        
        const data = await response.json();
        return data.src.original; // Returns the original size image URL
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
} 