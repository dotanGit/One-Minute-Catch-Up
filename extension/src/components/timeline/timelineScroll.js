let container;
let scrollAnimationFrame = null;
let isHoveringLeft = false;
let isHoveringRight = false;
const scrollSpeed = 1;
const scrollAmountOnClick = 1000;
let lastScrollPosition = 0;
let lastScrollTime = 0;
const SCROLL_THRESHOLD = 1000; // Switch wallpaper every 1000px of scroll
let scrollDebounceTimer = null;
const DEBOUNCE_DELAY = 100; // Wait 300ms after scrolling stops
let isScrollingToLatest = false;
let isScrollAnimationActive = false;  // Add this to track animation state
let animationTimeout = null;  // Add this for safety timeout

export function initTimelineScroll() {
    container = document.querySelector('.timeline-container');
    if (!container) return;

    // Add scroll event listener with debounce
    container.addEventListener('scroll', handleScroll);

    // Hover scroll
    document.getElementById('scroll-left').addEventListener('mouseenter', () => {
        isHoveringLeft = true;
        startScroll(-1);
    });
    document.getElementById('scroll-left').addEventListener('mouseleave', () => {
        isHoveringLeft = false;
        stopScroll();
    });

    document.getElementById('scroll-right').addEventListener('mouseenter', () => {
        if (isScrollingToLatest || isScrollAnimationActive) return;
        isHoveringRight = true;
        startScroll(1);
    });
    document.getElementById('scroll-right').addEventListener('mouseleave', () => {
        isHoveringRight = false;
        stopScroll();
    });

    // Click scroll
    document.getElementById('scroll-left').addEventListener('click', () => {
        stopScroll();
        container.scrollBy({ left: -scrollAmountOnClick, behavior: 'smooth' });
        setTimeout(() => {
            if (isHoveringLeft) startScroll(-1);
        }, 400);
    });

    document.getElementById('scroll-right').addEventListener('click', () => {
        stopScroll();
        container.scrollBy({ left: scrollAmountOnClick, behavior: 'smooth' });
        setTimeout(() => {
            if (isHoveringRight) startScroll(1);
        }, 400);
    });

    // Jump to latest
    document.getElementById('scroll-latest').addEventListener('click', async () => {
        if (isScrollingToLatest || isScrollAnimationActive) {
            resetScrollState();
            return;
        }

        isScrollingToLatest = true;
        
        // Disable the scroll buttons
        disableScrollButtons();
        
        if (isHoveringRight) {
            stopScroll();
            isHoveringRight = false;
        }
        
        if (scrollDebounceTimer) {
            clearTimeout(scrollDebounceTimer);
            scrollDebounceTimer = null;
        }
        
        container.removeEventListener('scroll', handleScroll);
        
        const wallpaperModule = await import('../wallpaper/wallPaper.js');
        wallpaperModule.forceResetToTimeBasedWallpaper();
        
        lastScrollPosition = container.scrollWidth;
        
        try {
            await smoothScrollTo(container.scrollWidth);
        } catch (error) {
            resetScrollState();
        } finally {
            // Re-enable the scroll buttons
            enableScrollButtons();
        }
    });
}

function startScroll(direction) {
    if (isScrollAnimationActive) return;
    
    stopScroll();
    const scrollAmount = scrollSpeed * direction;

    function scrollStep() {
        container.scrollLeft += scrollAmount;
        scrollAnimationFrame = requestAnimationFrame(scrollStep);
    }

    scrollStep();
}

function stopScroll() {
    if (scrollAnimationFrame !== null) {
        cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
    }
}

function resetScrollState() {
    isScrollingToLatest = false;
    isScrollAnimationActive = false;
    if (scrollAnimationFrame) {
        cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
    }
    if (animationTimeout) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
    }
    container.addEventListener('scroll', handleScroll);
    // Re-enable the scroll buttons
    enableScrollButtons();
}

// Smooth scroll function
function smoothScrollTo(targetPosition, duration = 600) {
    return new Promise((resolve) => {
        if (isScrollAnimationActive) {
            resetScrollState();
        }

        isScrollAnimationActive = true;
        const startPosition = container.scrollLeft;
        const distance = targetPosition - startPosition;
        const startTime = performance.now();
        
        function scrollStep(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeInOutCubic = progress => {
                return progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            };
            
            container.scrollLeft = startPosition + (distance * easeInOutCubic(progress));
            
            if (progress < 1) {
                scrollAnimationFrame = requestAnimationFrame(scrollStep);
            } else {
                resetScrollState();
                resolve();
            }
        }
        
        scrollAnimationFrame = requestAnimationFrame(scrollStep);
        
        animationTimeout = setTimeout(() => {
            resetScrollState();
            resolve();
        }, duration + 100);
    });
}

// Scroll handler
function handleScroll() {
    if (isScrollingToLatest) return;
    
    const currentScroll = container.scrollLeft;
    const scrollDelta = currentScroll - lastScrollPosition;
    const direction = scrollDelta > 0 ? 'forward' : 'backward';
    
    if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer);
    }
    
    scrollDebounceTimer = setTimeout(() => {
        if (Math.abs(scrollDelta) >= SCROLL_THRESHOLD) {
            lastScrollPosition = currentScroll;
            import('../wallpaper/wallPaper.js').then(module => {
                module.switchWallpaperTemporarily(direction);
            });
        }
    }, DEBOUNCE_DELAY);
}

function disableScrollButtons() {
    const leftButton = document.getElementById('scroll-left');
    const rightButton = document.getElementById('scroll-right');
    leftButton.classList.add('disabled');
    rightButton.classList.add('disabled');
}

function enableScrollButtons() {
    const leftButton = document.getElementById('scroll-left');
    const rightButton = document.getElementById('scroll-right');
    leftButton.classList.remove('disabled');
    rightButton.classList.remove('disabled');
}
