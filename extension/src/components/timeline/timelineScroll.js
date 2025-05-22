import { switchWallpaper, resetWallpaper } from '../wallpaper/wallpaperController.js';

let container;
let lastScrollLeft = 0;
let lastWallpaperSwitchPosition = 0;  // Track last scroll point where wallpaper changed
const SCROLL_THRESHOLD = 1000;        // Change wallpaper every 1000px of scroll
let hoverScrollFrame = null;
let hoverDirection = 0;
const HOVER_SCROLL_SPEED = 1;
const CLICK_SCROLL_STEP = 1000;


export function initTimelineScroll() {
  container = document.querySelector('.timeline-container');
  if (!container) return;

  // Native scroll (mouse wheel, drag)
  container.addEventListener('scroll', () => {
    const currentScroll = container.scrollLeft;
    const scrollDelta = Math.abs(currentScroll - lastWallpaperSwitchPosition);
  
    if (scrollDelta >= SCROLL_THRESHOLD) {
      const direction = currentScroll > lastWallpaperSwitchPosition ? 'forward' : 'backward';
      lastWallpaperSwitchPosition = currentScroll;
      switchWallpaper(direction);
    }
  
    lastScrollLeft = currentScroll;
  });
  

  // Button click scroll
  document.getElementById('scroll-left')?.addEventListener('click', () => {
    console.log('[DEBUG] scroll-left click');
    smoothScroll({ by: -CLICK_SCROLL_STEP });
  });
  
  
  document.getElementById('scroll-right')?.addEventListener('click', () => {
    console.log('[DEBUG] scroll-right click');
    smoothScroll({ by: CLICK_SCROLL_STEP });
  });
  
  
  // Hover scroll
  document.getElementById('scroll-left')?.addEventListener('mouseenter', () => startHoverScroll(-1));
  document.getElementById('scroll-left')?.addEventListener('mouseleave', stopHoverScroll);

  document.getElementById('scroll-right')?.addEventListener('mouseenter', () => startHoverScroll(1));
  document.getElementById('scroll-right')?.addEventListener('mouseleave', stopHoverScroll);

  // Scroll to latest
  document.getElementById('scroll-latest')?.addEventListener('click', () => {
    smoothScroll({ to: container.scrollWidth });
    resetWallpaper();
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

