import { findIndexForCurrentTime, getImageNameAtIndex } from '../wallpaper/wallpaperData.js';
import { setWallpaperByName } from '../wallpaper/wallpaperRenderer.js';
import { getBaseWallpaperIndex, setBaseWallpaperIndex } from '../wallpaper/wallpaperController.js';
import { getWallpaperList } from '../wallpaper/wallpaperData.js';

let container;
let pendingIndex = 0;
let isHovering = false;
let debounceTimer = null;
let isTransitioning = false;
let queuedIndex = null;

const SCROLL_THRESHOLD = 1000;
const CLICK_SCROLL_STEP = 1000;
const CHANGE_WALLPAPER_TIMEOUT = 50;
const HOVER_SCROLL_SPEED = 1;
let hoverScrollFrame = null;
let hoverDirection = 0;
let lastRenderedIndex = null;

// Debounced update with transition lock + queue
function scheduleWallpaperUpdate() {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    if (isHovering) return;

    const list = getWallpaperList();
    const normalizedIndex = ((pendingIndex % list.length) + list.length) % list.length;

    if (normalizedIndex === lastRenderedIndex) return;

    const imageName = getImageNameAtIndex(normalizedIndex);
    if (!imageName) return;

    if (isTransitioning) {
      queuedIndex = normalizedIndex;
      return;
    }

    lastRenderedIndex = normalizedIndex;
    isTransitioning = true;
    setWallpaperByName(imageName).then(() => {
      isTransitioning = false;
      if (queuedIndex !== null && queuedIndex !== lastRenderedIndex) {
        const queuedImage = getImageNameAtIndex(queuedIndex);
        if (queuedImage) {
          lastRenderedIndex = queuedIndex;
          queuedIndex = null;
          isTransitioning = true;
          setWallpaperByName(queuedImage).then(() => {
            isTransitioning = false;
          });
        }
      } else {
        queuedIndex = null;
      }
    });
  }, CHANGE_WALLPAPER_TIMEOUT);
}

export function initTimelineScroll() {
  container = document.querySelector('.timeline-container');
  if (!container) return;

  const baseIndex = getBaseWallpaperIndex();
  lastRenderedIndex = ((baseIndex % getWallpaperList().length) + getWallpaperList().length) % getWallpaperList().length;
  pendingIndex = baseIndex;

  container.addEventListener('scroll', () => {
    const offset = Math.abs(container.scrollLeft);
    const steps = Math.floor(offset / SCROLL_THRESHOLD);
    pendingIndex = getBaseWallpaperIndex() - steps;
    scheduleWallpaperUpdate();
  });

  document.getElementById('scroll-left')?.addEventListener('mouseenter', () => { isHovering = true; });
  document.getElementById('scroll-left')?.addEventListener('mouseleave', () => { isHovering = false; });
  document.getElementById('scroll-right')?.addEventListener('mouseenter', () => { isHovering = true; });
  document.getElementById('scroll-right')?.addEventListener('mouseleave', () => { isHovering = false; });

  document.getElementById('scroll-left')?.addEventListener('click', () => {
    isHovering = false;
    smoothScroll({ by: -CLICK_SCROLL_STEP });
  });
  document.getElementById('scroll-right')?.addEventListener('click', () => {
    isHovering = false;
    smoothScroll({ by: CLICK_SCROLL_STEP });
  });

  // Hover scroll
  document.getElementById('scroll-left')?.addEventListener('mouseenter', () => startHoverScroll(-1));
  document.getElementById('scroll-left')?.addEventListener('mouseleave', stopHoverScroll);
  document.getElementById('scroll-right')?.addEventListener('mouseenter', () => startHoverScroll(1));
  document.getElementById('scroll-right')?.addEventListener('mouseleave', stopHoverScroll);

  // Scroll-latest with queue
  document.getElementById('scroll-latest')?.addEventListener('click', () => {
    smoothScroll({ to: 0 })
    const index = findIndexForCurrentTime();
    setBaseWallpaperIndex(index);
    pendingIndex = index;

    const normalizedIndex = index % getWallpaperList().length;
    if (isTransitioning) {
      queuedIndex = normalizedIndex;
      return;
    }

    if (normalizedIndex !== lastRenderedIndex) {
      const imageName = getImageNameAtIndex(normalizedIndex);
      if (imageName) {
        lastRenderedIndex = normalizedIndex;
        isTransitioning = true;
        setWallpaperByName(imageName).then(() => {
          isTransitioning = false;
          if (queuedIndex !== null && queuedIndex !== lastRenderedIndex) {
            const queuedImage = getImageNameAtIndex(queuedIndex);
            if (queuedImage) {
              lastRenderedIndex = queuedIndex;
              queuedIndex = null;
              isTransitioning = true;
              setWallpaperByName(queuedImage).then(() => {
                isTransitioning = false;
              });
            }
          } else {
            queuedIndex = null;
          }
        });
      }
    }
  });
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
