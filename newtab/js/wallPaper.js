import { getImageById } from '../../js/services/pexelsService.js';
import { wallpaperIds } from '../../js/data/wallpaperIds.js';

let currentImageId = wallpaperIds.nature.ids[0]; // Default to first nature image
let isChangingBackground = false;

// Create and populate the dropdown
function createDropdown() {
    const dropdown = document.getElementById('wallpaperDropdown');
    
    // Create categories
    Object.entries(wallpaperIds).forEach(([category, data]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'wallpaper-category';
        
        const title = document.createElement('h3');
        title.textContent = data.name;
        categoryDiv.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'wallpaper-grid';
        
        // Create thumbnails for each image in the category
        data.ids.forEach(id => {
            const img = document.createElement('img');
            img.className = 'wallpaper-thumbnail';
            img.src = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=200`;
            img.alt = `Wallpaper ${id}`;
            
            img.addEventListener('click', () => {
                if (!isChangingBackground) {
                    currentImageId = id;
                    setBackground();
                    dropdown.classList.remove('show');
                }
            });
            
            grid.appendChild(img);
        });
        
        categoryDiv.appendChild(grid);
        dropdown.appendChild(categoryDiv);
    });
}

// Toggle dropdown visibility
document.getElementById('changeWallpaper').addEventListener('click', () => {
    const dropdown = document.getElementById('wallpaperDropdown');
    dropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('wallpaperDropdown');
    const button = document.getElementById('changeWallpaper');
    
    if (!dropdown.contains(e.target) && !button.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

async function setBackground() {
    if (isChangingBackground) return;
    
    isChangingBackground = true;
    const imageUrl = await getImageById(currentImageId);
    
    if (imageUrl) {
        // Create a temporary image to preload
        const tempImg = new Image();
        tempImg.src = imageUrl;
        
        tempImg.onload = () => {
            document.body.style.backgroundImage = `url(${imageUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
            isChangingBackground = false;
        };
        
        tempImg.onerror = () => {
            isChangingBackground = false;
            console.error('Failed to load image');
        };
    } else {
        isChangingBackground = false;
    }
}

// Handle window resize
window.addEventListener('resize', setBackground);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createDropdown();
    setBackground();
});