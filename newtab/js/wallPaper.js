//Original code - commented out for testing
import { wallpaperImages } from '../../js/data/wallpaperImages.js';

let isChangingBackground = false;

// Create and populate the dropdown
function createDropdown() {
    const dropdown = document.getElementById('wallpaperDropdown');
    
    Object.entries(wallpaperImages).forEach(([category, data]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'wallpaper-category';
        
        const title = document.createElement('h3');
        title.textContent = data.name;
        categoryDiv.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'wallpaper-grid';
        
        data.images.forEach(imageUrl => {
            const img = document.createElement('img');
            img.className = 'wallpaper-thumbnail';
            const thumbnailUrl = imageUrl.replace('/full/', '/thumbnails/');
            img.src = thumbnailUrl;
            img.loading = 'lazy';
            img.dataset.fullUrl = imageUrl;

            img.alt = `${data.name} Wallpaper`;
            
            img.addEventListener('click', function() {
                if (!isChangingBackground) {
                    // Use the stored URL instead of the event
                    setBackground(this.dataset.fullUrl);
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
document.getElementById('changeWallpaper').addEventListener('click', function(e) {
    e.preventDefault();
    const dropdown = document.getElementById('wallpaperDropdown');
    dropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('wallpaperDropdown');
    const button = document.getElementById('changeWallpaper');
    
    if (!dropdown.contains(e.target) && !button.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

function setBackground(imageUrl) {
    if (isChangingBackground) return;
    
    console.log('Setting background with URL:', imageUrl);
    isChangingBackground = true;
    
    // Create a temporary image to preload
    const tempImg = new Image();
    tempImg.src = imageUrl;
    
    tempImg.onload = function() {
        console.log('Image loaded successfully:', imageUrl);
        document.body.style.backgroundImage = `url("${imageUrl}")`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        isChangingBackground = false;
    };
    
    tempImg.onerror = function() {
        console.error('Failed to load image:', imageUrl);
        isChangingBackground = false;
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    createDropdown();
    // Set initial background with first nature image
    if (wallpaperImages.nature.images.length > 0) {
        setBackground(wallpaperImages.nature.images[0]);
    }
});


// // SIMPLE TEST CODE
// document.addEventListener('DOMContentLoaded', function() {
//     // Change this path to your image file
//     const testImage = './test-images/pexels-iriser-1379640.jpg';
    
//     document.body.style.backgroundImage = `url("${testImage}")`;
//     document.body.style.backgroundSize = 'cover';
//     document.body.style.backgroundPosition = 'center';
//     document.body.style.backgroundRepeat = 'no-repeat';
//     document.body.style.backgroundAttachment = 'fixed';
// });