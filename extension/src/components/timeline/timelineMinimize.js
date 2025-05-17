export async function initTimelineMinimize() {
    const minimizeBtn = document.getElementById('minimizeTimeline');
    const timelineContainer = document.querySelector('.timeline-container');
    
    // Load saved state
    chrome.storage.local.get('timelineMinimized', ({ timelineMinimized }) => {
        if (timelineMinimized) {
            timelineContainer.classList.add('minimized');
            minimizeBtn.querySelector('.material-icons').textContent = 'unfold_more';
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
        minimizeBtn.querySelector('.material-icons').textContent = 
            isMinimized ? 'unfold_more' : 'unfold_less';
        
        // Save state
        chrome.storage.local.set({ timelineMinimized: isMinimized });
    });
}
