export function initTimelineMinimize() {
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
        
        // Update icon
        minimizeBtn.querySelector('.material-icons').textContent = 
            isMinimized ? 'unfold_more' : 'unfold_less';
        
        // Save state
        chrome.storage.local.set({ timelineMinimized: isMinimized });
    });
}
