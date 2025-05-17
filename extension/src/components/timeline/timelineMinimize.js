export async function initTimelineMinimize() {
    const minimizeBtn = document.getElementById('minimizeTimeline');
    const timelineContainer = document.querySelector('.timeline-container');
    const minimizeIcon = minimizeBtn.querySelector('.minimize-icon');
    
    // Load saved state
    chrome.storage.local.get('timelineMinimized', ({ timelineMinimized }) => {
        if (timelineMinimized) {
            timelineContainer.classList.add('minimized');
            minimizeIcon.src = '../assets/icons/timeline/unfold_more.svg';
        }
    });

    minimizeBtn.addEventListener('click', () => {
        const isMinimized = timelineContainer.classList.toggle('minimized');
        
        // Force immediate hide of all popups when minimizing
        if (isMinimized) {
            const popups = timelineContainer.querySelectorAll('.event-popup');
            popups.forEach(popup => popup.classList.add('force-hide'));
            // Remove the force-hide class after animation completes
            setTimeout(() => {
                popups.forEach(popup => popup.classList.remove('force-hide'));
            }, 300);
        }
        
        // Update icon
        minimizeIcon.src = isMinimized 
            ? '../assets/icons/timeline/unfold_more.svg'
            : '../assets/icons/timeline/unfold_less.svg';
        
        // Save state
        chrome.storage.local.set({ timelineMinimized: isMinimized });
    });
}
