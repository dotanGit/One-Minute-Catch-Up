let isChangingBackground = false;

// Create and populate the dropdown
function createDropdown() {
    const dropdown = document.getElementById('wallpaperDropdown');
    const grid = document.createElement('div');
    grid.className = 'wallpaper-grid';
    
    // Add your images directly
    const images = [
        'https://dotangit.github.io/chrome-extension-images/nature/2325447.jpg',
        'https://dotangit.github.io/chrome-extension-images/nature/265216.jpg'
    ];
    
    images.forEach(imageUrl => {
        const img = document.createElement('img');
        img.className = 'wallpaper-thumbnail';
        img.src = imageUrl;
        img.alt = 'Wallpaper';
        
        img.addEventListener('click', () => {
            if (!isChangingBackground) {
                setBackground(imageUrl);
                dropdown.classList.remove('show');
            }
        });
        
        grid.appendChild(img);
    });
    
    dropdown.appendChild(grid);
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

function setBackground(imageUrl) {
    if (isChangingBackground) return;
    
    isChangingBackground = true;
    
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
        console.error('Failed to load image from:', imageUrl);
    };
}

// Handle window resize
window.addEventListener('resize', setBackground);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createDropdown();
    // Set initial background
    setBackground('https://dotangit.github.io/chrome-extension-images/nature/1955134.jpg');
});