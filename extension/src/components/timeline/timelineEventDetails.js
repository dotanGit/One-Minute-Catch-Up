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
            console.log('Creating download event details:', {
                type: event.type,
                title: event.title,
                actualTitle: event.actualTitle,
                description: event.description,
                url: event.url,
                downloadUrl: event.downloadUrl,
                filename: event.filename,
                downloadId: event.downloadId,
                sourceUrl: event.sourceUrl
            });
            return {
                title: 'Download',
                details: [
                    { 
                        label: 'File', 
                        value: event.actualTitle,
                        isLink: true,
                        onClick: async (e) => {
                            console.log('File click handler triggered');
                            console.log('Event data:', event);
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const detailItem = e.target.closest('.detail-item');
                            console.log('Detail item found:', detailItem);
                            
                            let statusDiv = detailItem.querySelector('.file-status');
                            if (!statusDiv) {
                                statusDiv = document.createElement('div');
                                statusDiv.className = 'file-status';
                                detailItem.appendChild(statusDiv);
                            }

                            try {
                                statusDiv.className = 'file-status pending';
                                statusDiv.textContent = 'Opening file...';
                                statusDiv.style.display = 'block';
                                statusDiv.style.opacity = '1';
                                
                                console.log('Attempting to open download with ID:', event.downloadId);
                                try {
                                    await chrome.downloads.open(event.downloadId);
                                    console.log('Download opened successfully');
                                    statusDiv.className = 'file-status success';
                                    statusDiv.textContent = 'File opened successfully!';
                                    setTimeout(() => {
                                        statusDiv.style.display = 'none';
                                    }, 2000);
                                } catch (openError) {
                                    console.error('Error opening download:', openError);
                                    statusDiv.className = 'file-status error';
                                    statusDiv.textContent = 'Error: Could not open the file';
                                }
                            } catch (error) {
                                console.error('Error in click handler:', error);
                                statusDiv.className = 'file-status error';
                                statusDiv.textContent = 'Error: Could not open the file';
                                statusDiv.style.display = 'block';
                                statusDiv.style.opacity = '1';
                            }
                        }
                    },
                    { 
                        label: 'From', 
                        value: event.description,
                        isLink: true,
                        onClick: (e) => {
                            e.preventDefault();
                            console.log('From link clicked. Available URLs:', {
                                url: event.url,
                                downloadUrl: event.downloadUrl,
                                sourceUrl: event.sourceUrl,
                                description: event.description
                            });
                            const targetUrl = event.sourceUrl || event.url;
                            console.log('Opening URL:', targetUrl);
                            window.open(targetUrl, '_blank');
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
