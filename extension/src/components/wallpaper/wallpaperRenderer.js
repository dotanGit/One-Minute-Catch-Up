const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/dotanGit/chrome-extension-images/main/jpg-format';
const CURRENT_IMAGE_KEY = 'current_wallpaper';
const TRANSITION_DURATION = 1000;

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function getImageBase64(imageName, cache = true) {
    try {
        const result = await chrome.storage.local.get(CURRENT_IMAGE_KEY);
        if (result[CURRENT_IMAGE_KEY]?.name === imageName) {
            return result[CURRENT_IMAGE_KEY].data;
        }

        const response = await fetch(`${GITHUB_RAW_URL}/${imageName}`);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        if (cache) {
            await chrome.storage.local.set({
                [CURRENT_IMAGE_KEY]: {
                    name: imageName,
                    data: base64
                }
            });
        }

        return base64;
    } catch (err) {
        console.error('Failed to fetch/cached image:', err);
        const response = await fetch(`${GITHUB_RAW_URL}/${imageName}`);
        const blob = await response.blob();
        return blobToBase64(blob);
    }
}


export async function setWallpaperByName(imageName, { cache = true, immediate = false } = {}) {
    const base64 = await getImageBase64(imageName, cache);

    const containerId = 'wallpaper-transition-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }

    if (immediate) {
        const finalDiv = document.createElement('div');
        finalDiv.className = 'wallpaper-slide final';
        finalDiv.style.backgroundImage = `url("${base64}")`;
        container.innerHTML = '';
        container.appendChild(finalDiv);
        return;
    }

    // Normal transition continues
    const oldSlide = container.querySelector('.wallpaper-slide');
    const oldBg = oldSlide ? oldSlide.style.backgroundImage : 'none';

    const oldDiv = document.createElement('div');
    oldDiv.className = 'wallpaper-slide current';
    oldDiv.style.backgroundImage = oldBg;

    const newDiv = document.createElement('div');
    newDiv.className = 'wallpaper-slide new';
    newDiv.style.backgroundImage = `url("${base64}")`;

    container.innerHTML = '';
    container.appendChild(oldDiv);
    container.appendChild(newDiv);

    oldDiv.offsetHeight;
    newDiv.offsetHeight;

    requestAnimationFrame(() => {
        oldDiv.style.opacity = '0';
        newDiv.style.opacity = '1';
    });

    return new Promise(resolve => {
        setTimeout(() => {
            const finalDiv = document.createElement('div');
            finalDiv.className = 'wallpaper-slide final';
            finalDiv.style.backgroundImage = `url("${base64}")`;
            container.innerHTML = '';
            container.appendChild(finalDiv);
            resolve();
        }, TRANSITION_DURATION);
    });
}



export async function renderCachedWallpaperInstantly() {
    const result = await chrome.storage.local.get('current_wallpaper');
    const cached = result.current_wallpaper;
    if (!cached || !cached.data) return;

    const containerId = 'wallpaper-transition-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }

    const finalDiv = document.createElement('div');
    finalDiv.className = 'wallpaper-slide final';
    finalDiv.style.backgroundImage = `url("${cached.data}")`;
    container.innerHTML = '';
    container.appendChild(finalDiv);
}


