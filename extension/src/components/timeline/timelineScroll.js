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

            if (normalizedIndex === this.lastRenderedIndex) return;

            const imageName = getImageNameAtIndex(normalizedIndex);
            if (!imageName) return;

            if (this.isTransitioning) {
                this.queuedIndex = normalizedIndex;
                return;
            }

            this.lastRenderedIndex = normalizedIndex;
            this.isTransitioning = true;
            
            // Use setWallpaperByName with transition
            setWallpaperByName(imageName, { cache: false, immediate: false }).then(() => {
                this.isTransitioning = false;
                this.handleQueuedUpdate();
            });
        }, this.CHANGE_WALLPAPER_TIMEOUT);
    }

    handleQueuedUpdate() {
        if (this.queuedIndex !== null && this.queuedIndex !== this.lastRenderedIndex) {
            const queuedImage = getImageNameAtIndex(this.queuedIndex);
            if (queuedImage) {
                this.lastRenderedIndex = this.queuedIndex;
                this.queuedIndex = null;
                this.isTransitioning = true;
                // Use setWallpaperByName with transition
                setWallpaperByName(queuedImage, { cache: false, immediate: false }).then(() => {
                    this.isTransitioning = false;
                });
            }
        } else {
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
        this.smoothScroll({ to: 0 });
        const index = findIndexForCurrentTime();
        const list = getWallpaperList();
        const normalizedIndex = index % list.length;
        const normalizedLastIndex = ((this.lastRenderedIndex % list.length) + list.length) % list.length;
        const currentImageName = getImageNameAtIndex(normalizedLastIndex);
        const targetImageName = getImageNameAtIndex(normalizedIndex);
        
        if (currentImageName !== targetImageName && !this.isTransitioning) {
            setBaseWallpaperIndex(index);
            this.pendingIndex = index;

            if (targetImageName) {
                this.lastRenderedIndex = normalizedIndex;
                this.isTransitioning = true;
                // Use setWallpaperByName with transition
                setWallpaperByName(targetImageName, { cache: false, immediate: false }).then(() => {
                    this.isTransitioning = false;
                    this.handleQueuedUpdate();
                });
            }
        } else if (this.isTransitioning) {
            this.queuedIndex = normalizedIndex;
        }
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
