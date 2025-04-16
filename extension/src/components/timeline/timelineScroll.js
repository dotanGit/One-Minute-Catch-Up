// timelineScroll.js
import { loadAndPrependTimelineData } from './timeline.js';

let container;
let scrollAnimationFrame = null;
let isHoveringLeft = false;
let isHoveringRight = false;
const scrollSpeed = 1;
const scrollAmountOnClick = 1000;
let oldestLoadedDate;
let isLoadingMorePastDays;

export function initTimelineScroll(refs) {
    container = document.querySelector('.timeline-container');
    oldestLoadedDate = refs.oldestLoadedDateRef;
    isLoadingMorePastDays = refs.isLoadingMorePastDays;

    if (!container) return;

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
    document.getElementById('scroll-latest').addEventListener('click', () => {
        container.style.scrollBehavior = 'smooth';
        container.scrollLeft = container.scrollWidth;
        setTimeout(() => container.style.scrollBehavior = 'auto', 500);
    });

    // Infinite scroll (prepend)
    container.addEventListener('scroll', () => {
        if (container.scrollLeft < 1500 && !isLoadingMorePastDays.value) {
            isLoadingMorePastDays.value = true;
            oldestLoadedDate.value.setUTCDate(oldestLoadedDate.value.getUTCDate() - 1);
            const previousDate = new Date(oldestLoadedDate.value); // already updated
            previousDate.setUTCHours(0, 0, 0, 0);            
            console.log('Fetching data for:', previousDate.toISOString());
            loadAndPrependTimelineData(previousDate).finally(() => {
                isLoadingMorePastDays.value = false;
            });
        }
    });
}

function startScroll(direction) {
    stopScroll();
    const isRTL = getComputedStyle(container).direction === 'rtl';
    const scrollAmount = scrollSpeed * (isRTL ? -1 : 1) * direction;

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
