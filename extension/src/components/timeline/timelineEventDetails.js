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
                        label: 'Website', 
                        value: event.description,
                        isLink: true,
                        url: event.url
                    },
                ],
                actions: isLocalFile ? [
                    { 
                        label: 'Find File', 
                        onClick: async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const filePath = decodeURIComponent(event.url.replace('file:///', ''));
                            const fileName = filePath.split('/').pop();
                            
                            const popup = e.target.closest('.event-popup');
                            const actionsDiv = popup.querySelector('.event-actions');
                            
                            let statusDiv = actionsDiv.querySelector('.file-status');
                            if (!statusDiv) {
                                statusDiv = document.createElement('div');
                                statusDiv.className = 'file-status';
                                actionsDiv.insertBefore(statusDiv, e.target);
                            }

                            try {
                                statusDiv.className = 'file-status pending';
                                statusDiv.textContent = 'Searching for file...';
                                statusDiv.style.display = 'block';
                                statusDiv.style.opacity = '1';

                                const downloadItems = await chrome.downloads.search({
                                    query: [fileName],
                                    exists: true
                                });
                                
                                if (downloadItems && downloadItems.length > 0) {
                                    downloadItems.sort((a, b) => b.startTime - a.startTime);
                                    
                                    statusDiv.className = 'file-status success';
                                    statusDiv.textContent = 'Opening file...';
                                    
                                    try {
                                        await chrome.downloads.open(downloadItems[0].id);
                                        statusDiv.textContent = 'File opened successfully!';
                                    } catch (openError) {
                                        console.error('Error opening file:', openError);
                                        statusDiv.className = 'file-status error';
                                        statusDiv.textContent = 'Error: Could not open the file';
                                    }
                                } else {
                                    statusDiv.className = 'file-status warning';
                                    statusDiv.textContent = 'File not found in downloads';
                                    
                                    const openButton = document.createElement('button');
                                    openButton.className = 'action-button secondary';
                                    openButton.textContent = 'Open File Location';
                                    openButton.onclick = (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.open(event.url, '_blank');
                                    };
                                    
                                    actionsDiv.appendChild(openButton);
                                }
                            } catch (error) {
                                console.error('Error in Find File handler:', error);
                                statusDiv.className = 'file-status error';
                                statusDiv.textContent = 'Error: Could not search for the file';
                                statusDiv.style.display = 'block';
                                statusDiv.style.opacity = '1';
                            }
                        }
                    }
                ] : [
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
