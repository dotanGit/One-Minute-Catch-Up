function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}


export function getEventDetails(event) {
    switch (event.type) {
        case 'drive':
            return {
                title: event.title,
                details: [
                    { 
                        label: 'File Name', 
                        value: event.description,
                        isLink: true,
                        url: event.webViewLink || '#'
                    },
                    { label: 'Last Edit', value: new Date(event.timestamp).toLocaleTimeString() },
                ],
                actions: []
            };
        case 'download':
            return {
                title: 'Download',
                details: [
                    { 
                        label: 'File', 
                        value: event.actualTitle,
                        isLink: true,
                        onClick: async (e) => {
                            console.log('Download click handler triggered');
                            console.log('Event data:', event);
                            e.preventDefault();
                            e.stopPropagation();
                            
                            try {
                                // First try to open using downloadId
                                await chrome.downloads.open(event.id);
                            } catch (error) {
                                console.log('Failed to open with downloadId, trying to check if file exists...');
                                
                                // Check if file exists using downloads.search
                                const searchResults = await chrome.downloads.search({
                                    filename: event.filename.split('\\').pop(), // Get just the filename
                                    exists: true
                                });

                                if (searchResults.length > 0) {
                                    // File exists, try to open it using the found download item
                                    try {
                                        await chrome.downloads.open(searchResults[0].id);
                                        return; // Exit if successful
                                    } catch (secondError) {
                                        console.error('Failed to open existing file:', secondError);
                                    }
                                }

                                // If we get here, show the modal
                                const modal = document.getElementById('download-error-modal');
                                modal.classList.add('show');
                                
                                // Handle redownload button
                                const redownloadBtn = document.getElementById('redownload-btn');
                                redownloadBtn.onclick = () => {
                                    if (event.downloadUrl && !event.downloadUrl.startsWith('blob:')) {
                                        chrome.downloads.download({ url: event.downloadUrl });
                                        modal.classList.remove('show');
                                    } else {
                                        console.error('No valid download URL available');
                                        alert('Sorry, the original download link is no longer available.');
                                    }
                                };
                                
                                // Handle close button
                                const closeBtn = document.getElementById('close-modal-btn');
                                closeBtn.onclick = () => {
                                    modal.classList.remove('show');
                                };
                                
                                // Close on outside click
                                modal.onclick = (e) => {
                                    if (e.target === modal) {
                                        modal.classList.remove('show');
                                    }
                                };
                            }
                        }
                    }
                ],
                actions: []
            };
        case 'browser':
            const isLocalFile = event.url.startsWith('file://');
            return {
                title: 'Browser Visit',
                details: [
                    { 
                        label: 'Title', 
                        value: event.actualTitle || 'No title'
                    },
                    { 
                        label: isLocalFile ? 'File' : 'Website', 
                        value: isLocalFile ? event.url.replace('file:///', '') : event.description,
                        isLink: true,
                        url: event.url
                    }
                ],
                actions: [
                    { 
                        label: 'Visit Site', 
                        url: event.url,
                        onClick: (e) => {
                            e.preventDefault();
                            window.open(event.url, '_blank');
                        }
                    }
                ]
            };
        case 'email':
            return {
                title: event.title,
                details: [
                    { 
                        label: 'Subject', 
                        value: event.subject,
                        isLink: true,
                        url: event.emailUrl || '#'
                    }
                ],
                actions: []
            };
        case 'calendar':
            return {
                title: event.title,
                details: [
                    { 
                        label: 'Summary', 
                        value: event.description,
                        role: 'heading'
                    },
                    { label: 'Location', value: event.location || 'No location' },
                ],
                actions: []
            };
        default:
            return {
                title: event.title || 'Browser Activity',
                details: [
                    { 
                        label: 'Website', 
                        value: event.description,
                        isLink: true,
                        url: event.url || '#'
                    },
                    { label: 'Title', value: event.title },
                ],
                actions: []
            };
    }
}
