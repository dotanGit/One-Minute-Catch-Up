import { findIndexForCurrentTime, getImageNameAtIndex } from '../wallpaper/wallpaperData.js';
import { setWallpaperByName } from '../wallpaper/wallpaperRenderer.js';
import { getBaseWallpaperIndex, setBaseWallpaperIndex } from '../wallpaper/wallpaperController.js';
import { getWallpaperList } from '../wallpaper/wallpaperData.js';


let container;
let scrollSteps = 0;
let pendingIndex = 0;
let switchTimer = null;
let isHovering = false;
const SCROLL_THRESHOLD = 1000;
const CLICK_SCROLL_STEP = 1000;
const HOVER_SCROLL_SPEED = 1;
let hoverScrollFrame = null;
let hoverDirection = 0;
let lastRenderedIndex = null;
let lastScrollStep = 0; // 👈 add this

export function initTimelineScroll() {
  container = document.querySelector('.timeline-container');
  if (!container) return;

  // SCROLL HANDLER
  container.addEventListener('scroll', () => {
    const baseIndex = getBaseWallpaperIndex();
    const offset = Math.abs(container.scrollLeft);
    scrollSteps = Math.floor(offset / SCROLL_THRESHOLD);
    pendingIndex = getBaseWallpaperIndex() - scrollSteps;
  
    console.log('-----[SCROLL TRIGGERED]-----');
    console.log('scrollLeft:', offset);
    console.log('SCROLL_THRESHOLD:', SCROLL_THRESHOLD);
    console.log('scrollSteps:', scrollSteps);
    console.log('lastScrollStep:', lastScrollStep);
    console.log('baseIndex:', baseIndex);
    console.log('pendingIndex:', pendingIndex);
  
    if (scrollSteps === lastScrollStep) {
      console.log('[SCROLL] No movement beyond threshold — skipped');
      return;
    }
  
    lastScrollStep = scrollSteps;
  
    if (switchTimer) clearTimeout(switchTimer);
    switchTimer = setTimeout(() => {
      if (!isHovering) {
        const list = getWallpaperList();
        const listLength = list.length;
        let normalizedIndex = ((pendingIndex % listLength) + listLength) % listLength;
  
        console.log('[TIMER FIRED]');
        console.log('normalizedIndex:', normalizedIndex);
        console.log('lastRenderedIndex:', lastRenderedIndex);
  
        if (normalizedIndex === lastRenderedIndex) {
          console.log('[WALLPAPER] Skipped — same image already shown:', normalizedIndex);
          return;
        }
  
        const imageName = getImageNameAtIndex(normalizedIndex);
        console.log('[WALLPAPER] Fetching image at index:', normalizedIndex, '→', imageName);
  
        if (imageName) {
          lastRenderedIndex = normalizedIndex;
          console.log('[WALLPAPER] setWallpaperByName:', imageName);
          setWallpaperByName(imageName);
        } else {
          console.warn('[WALLPAPER] No image found for index:', normalizedIndex);
        }
      } else {
        console.log('[WALLPAPER] Skipped switch (hovering)');
      }
    }, 300);
  });
  

  // Hover flag (to pause switching while hovering)
  document.getElementById('scroll-left')?.addEventListener('mouseenter', () => {
    isHovering = true;
    console.log('[HOVER] entered scroll-left');
  });
  document.getElementById('scroll-left')?.addEventListener('mouseleave', () => {
    isHovering = false;
    console.log('[HOVER] left scroll-left');
  });
  
  document.getElementById('scroll-right')?.addEventListener('mouseenter', () => {
    isHovering = true;
    console.log('[HOVER] entered scroll-right');
  });
  document.getElementById('scroll-right')?.addEventListener('mouseleave', () => {
    isHovering = false;
    console.log('[HOVER] left scroll-right');
  });
  
  

  // Button click scroll
  document.getElementById('scroll-left')?.addEventListener('click', () => {
    smoothScroll({ by: -CLICK_SCROLL_STEP });
  });

  document.getElementById('scroll-right')?.addEventListener('click', () => {
    smoothScroll({ by: CLICK_SCROLL_STEP });
  });

  // Hover scroll
  document.getElementById('scroll-left')?.addEventListener('mouseenter', () => startHoverScroll(-1));
  document.getElementById('scroll-left')?.addEventListener('mouseleave', stopHoverScroll);
  document.getElementById('scroll-right')?.addEventListener('mouseenter', () => startHoverScroll(1));
  document.getElementById('scroll-right')?.addEventListener('mouseleave', stopHoverScroll);

  // Reset scroll and wallpaper to base
  document.getElementById('scroll-latest')?.addEventListener('click', () => {
    container.scrollLeft = 1;
    const index = findIndexForCurrentTime();
    setBaseWallpaperIndex(index);
    scrollSteps = 0;
    pendingIndex = index;
    lastScrollStep = 0;
  
    const normalizedIndex = index % getWallpaperList().length;
    if (normalizedIndex === lastRenderedIndex) {
      console.log('[LATEST] Skipped — already showing image at index:', normalizedIndex);
      return;
    }
  
    const imageName = getImageNameAtIndex(normalizedIndex);
    console.log('[LATEST] Fetching image at index:', normalizedIndex, '→', imageName);
    if (imageName) {
      lastRenderedIndex = normalizedIndex;
      setWallpaperByName(imageName);
      console.log('[LATEST] setWallpaperByName:', imageName);
    } else {
      console.warn('[LATEST] No image found at index:', normalizedIndex);
    }
  });
  
  const initialIndex = getBaseWallpaperIndex();
  lastRenderedIndex = ((initialIndex % getWallpaperList().length) + getWallpaperList().length) % getWallpaperList().length;

}

function startHoverScroll(direction) {
  hoverDirection = direction;
  if (!hoverScrollFrame) scrollStep();
}

function stopHoverScroll() {
  cancelAnimationFrame(hoverScrollFrame);
  hoverScrollFrame = null;
}

function scrollStep() {
  container.scrollLeft += HOVER_SCROLL_SPEED * hoverDirection;
  hoverScrollFrame = requestAnimationFrame(scrollStep);
}

function smoothScroll({ by = null, to = null, duration = 750 }) {
  const start = container.scrollLeft;
  const distance = by !== null ? by : (to - start);
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    container.scrollLeft = start + distance * ease;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}
