import { findIndexForCurrentTime, getImageNameAtIndex, getWallpaperList } from '../wallpaper/wallpaperData.js';
import { setWallpaperByName } from '../wallpaper/wallpaperRenderer.js';
import { getBaseWallpaperIndex, setBaseWallpaperIndex } from '../wallpaper/wallpaperController.js';

class TimelineScroll {
    constructor() {
        this.container = null;
        this.pendingIndex = 0;
        this.isHovering = false;
        this.debounceTimer = null;
        this.isTransitioning = false;
        this.queuedIndex = null;
        this.hoverScrollFrame = null;
        this.hoverDirection = 0;
        this.lastRenderedIndex = null;

        // Constants
        this.SCROLL_THRESHOLD = 1000;
        this.CLICK_SCROLL_STEP = 1000;
        this.CHANGE_WALLPAPER_TIMEOUT = 50;
        this.HOVER_SCROLL_SPEED = 1;
    }

    resetState() {
        this.pendingIndex = 0;
        this.isHovering = false;
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.isTransitioning = false;
        this.queuedIndex = null;
        if (this.hoverScrollFrame) {
            cancelAnimationFrame(this.hoverScrollFrame);
            this.hoverScrollFrame = null;
        }
        this.hoverDirection = 0;
        this.lastRenderedIndex = null;
    }

    scheduleWallpaperUpdate() {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
            if (this.isHovering) return;

            const list = getWallpaperList();
            const normalizedIndex = ((this.pendingIndex % list.length) + list.length) % list.length;

            console.log('[DEBUG] scheduleWallpaperUpdate called:', {
                pendingIndex: this.pendingIndex,
                normalizedIndex,
                lastRenderedIndex: this.lastRenderedIndex,
                isTransitioning: this.isTransitioning,
                queuedIndex: this.queuedIndex
            });

            if (normalizedIndex === this.lastRenderedIndex) {
                console.log('[DEBUG] Skipping - same as last rendered');
                return;
            }

            const imageName = getImageNameAtIndex(normalizedIndex);
            if (!imageName) return;

            if (this.isTransitioning) {
                console.log('[DEBUG] Queuing wallpaper change to:', imageName);
                this.queuedIndex = normalizedIndex;
                return;
            }

            console.log('[DEBUG] Changing wallpaper to:', imageName);
            this.lastRenderedIndex = normalizedIndex;
            this.isTransitioning = true;
            
            // Use setWallpaperByName with transition
            setWallpaperByName(imageName, { cache: false, immediate: false }).then(() => {
                console.log('[DEBUG] Wallpaper change completed, calling handleQueuedUpdate');
                this.isTransitioning = false;
                this.handleQueuedUpdate();
            });
        }, this.CHANGE_WALLPAPER_TIMEOUT);
    }

    handleQueuedUpdate() {
        console.log('[DEBUG] handleQueuedUpdate called:', {
            queuedIndex: this.queuedIndex,
            lastRenderedIndex: this.lastRenderedIndex
        });
        
        if (this.queuedIndex !== null && this.queuedIndex !== this.lastRenderedIndex) {
            const queuedImage = getImageNameAtIndex(this.queuedIndex);
            if (queuedImage) {
                console.log('[DEBUG] Processing queued wallpaper change to:', queuedImage);
                this.lastRenderedIndex = this.queuedIndex;
                this.queuedIndex = null;
                this.isTransitioning = true;
                // Use setWallpaperByName with transition
                setWallpaperByName(queuedImage, { cache: false, immediate: false }).then(() => {
                    this.isTransitioning = false;
                });
            }
        } else {
            console.log('[DEBUG] No queued update to process');
            this.queuedIndex = null;
        }
    }

    setupEventListeners() {
        // Scroll event
        this.container.addEventListener('scroll', () => {
            const offset = Math.abs(this.container.scrollLeft);
            const steps = Math.floor(offset / this.SCROLL_THRESHOLD);
            this.pendingIndex = getBaseWallpaperIndex() - steps;
            this.scheduleWallpaperUpdate();
        });

        // Hover events
        const scrollLeft = document.getElementById('scroll-left');
        const scrollRight = document.getElementById('scroll-right');
        const scrollLatest = document.getElementById('scroll-latest');

        if (scrollLeft) {
            scrollLeft.addEventListener('mouseenter', () => { this.isHovering = true; });
            scrollLeft.addEventListener('mouseleave', () => { this.isHovering = false; });
            scrollLeft.addEventListener('click', () => {
                this.isHovering = false;
                this.smoothScroll({ by: -this.CLICK_SCROLL_STEP });
            });
            scrollLeft.addEventListener('mouseenter', () => this.startHoverScroll(-1));
            scrollLeft.addEventListener('mouseleave', () => this.stopHoverScroll());
        }

        if (scrollRight) {
            scrollRight.addEventListener('mouseenter', () => { this.isHovering = true; });
            scrollRight.addEventListener('mouseleave', () => { this.isHovering = false; });
            scrollRight.addEventListener('click', () => {
                this.isHovering = false;
                this.smoothScroll({ by: this.CLICK_SCROLL_STEP });
            });
            scrollRight.addEventListener('mouseenter', () => this.startHoverScroll(1));
            scrollRight.addEventListener('mouseleave', () => this.stopHoverScroll());
        }

        if (scrollLatest) {
            scrollLatest.addEventListener('click', () => this.handleScrollLatest());
        }
    }

    handleScrollLatest() {
        console.log('[DEBUG] handleScrollLatest called');
        
        // Clear any queued wallpaper changes to prevent interference
        this.queuedIndex = null;
        
        // Temporarily disable scroll events during smooth scroll
        this.isHovering = true;
        
        // Also set transitioning to prevent any wallpaper changes during scroll
        this.isTransitioning = true;
        
        this.smoothScroll({ to: 0 });
        const index = findIndexForCurrentTime();
        const list = getWallpaperList();
        const normalizedIndex = index % list.length;
        const normalizedLastIndex = ((this.lastRenderedIndex % list.length) + list.length) % list.length;
        const currentImageName = getImageNameAtIndex(normalizedLastIndex);
        const targetImageName = getImageNameAtIndex(normalizedIndex);
        
        console.log('[DEBUG] handleScrollLatest details:', {
            index,
            normalizedIndex,
            normalizedLastIndex,
            currentImageName,
            targetImageName,
            isTransitioning: this.isTransitioning
        });
        
        // Wait for smooth scroll to complete before changing wallpaper
        setTimeout(() => {
            if (currentImageName !== targetImageName) {
                console.log('[DEBUG] Changing wallpaper via handleScrollLatest to:', targetImageName);
                setBaseWallpaperIndex(index);
                this.pendingIndex = index;

                if (targetImageName) {
                    this.lastRenderedIndex = normalizedIndex;
                    // Use setWallpaperByName with transition
                    setWallpaperByName(targetImageName, { cache: false, immediate: false }).then(() => {
                        console.log('[DEBUG] handleScrollLatest wallpaper change completed');
                        this.isTransitioning = false;
                        this.isHovering = false;
                        this.handleQueuedUpdate();
                    });
                } else {
                    this.isTransitioning = false;
                    this.isHovering = false;
                }
            } else {
                console.log('[DEBUG] No wallpaper change needed in handleScrollLatest');
                this.isTransitioning = false;
                this.isHovering = false;
            }
        }, 800); // Wait for smooth scroll to complete (750ms + buffer)
    }

    startHoverScroll(direction) {
        this.hoverDirection = direction;
        if (!this.hoverScrollFrame) this.scrollStep();
    }

    stopHoverScroll() {
        cancelAnimationFrame(this.hoverScrollFrame);
        this.hoverScrollFrame = null;
    }

    scrollStep() {
        this.container.scrollLeft += this.HOVER_SCROLL_SPEED * this.hoverDirection;
        this.hoverScrollFrame = requestAnimationFrame(() => this.scrollStep());
    }

    smoothScroll({ by = null, to = null, duration = 750 }) {
        const start = this.container.scrollLeft;
        const distance = by !== null ? by : (to - start);
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            this.container.scrollLeft = start + distance * ease;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    init() {
        this.container = document.querySelector('.timeline-container');
        if (!this.container) return;

        // Reset all state
        this.resetState();

        const baseIndex = getBaseWallpaperIndex();
        this.lastRenderedIndex = ((baseIndex % getWallpaperList().length) + getWallpaperList().length) % getWallpaperList().length;
        this.pendingIndex = baseIndex;

        this.setupEventListeners();
    }
}

// Create singleton instance
const timelineScroll = new TimelineScroll();

// Export initialization function
export const initTimelineScroll = () => timelineScroll.init();
