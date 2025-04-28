export async function initTimelineMinimize() {
    const minimizeBtn = document.getElementById('minimizeTimeline');
    const timelineWrapper = document.querySelector('.timeline-wrapper');
    
    // Load saved state
    chrome.storage.local.get('timelineMinimized', ({ timelineMinimized }) => {
        if (timelineMinimized) {
            timelineWrapper.classList.add('minimized');
            minimizeBtn.querySelector('.material-icons').textContent = 'unfold_more';
        }
    });

    minimizeBtn.addEventListener('click', () => {
        const isMinimized = timelineWrapper.classList.toggle('minimized');
        
        // Force immediate hide of all popups when minimizing
        if (isMinimized) {
            const popups = timelineWrapper.querySelectorAll('.event-popup');
            popups.forEach(popup => popup.classList.add('force-hide'));
            // Remove the force-hide class after animation completes
            setTimeout(() => {
                popups.forEach(popup => popup.classList.remove('force-hide'));
            }, 300);
        }
        
        // Update icon
        minimizeBtn.querySelector('.material-icons').textContent = 
            isMinimized ? 'unfold_more' : 'unfold_less';
        
        // Save state
        chrome.storage.local.set({ timelineMinimized: isMinimized });
    });
}
