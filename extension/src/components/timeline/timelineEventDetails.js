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
                                await chrome.downloads.open(event.downloadId);
                                console.log('Download opened successfully');
                                statusDiv.className = 'file-status success';
                                statusDiv.textContent = 'File opened successfully!';
                                setTimeout(() => {
                                    statusDiv.style.display = 'none';
                                }, 2000);
                            } catch (error) {
                                // Show modal
                                const modal = document.getElementById('download-error-modal');
                                modal.classList.add('show');
                                
                                // Handle redownload button
                                const redownloadBtn = document.getElementById('redownload-btn');
                                redownloadBtn.onclick = () => {
                                    if (event.url) {
                                        chrome.downloads.download({ url: event.url });
                                        modal.classList.remove('show');
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
                    },
                    { 
                        label: 'Source',
                        value: event.sourceUrl && isValidUrl(event.sourceUrl) ? (new URL(event.sourceUrl)).hostname : 'Unknown',
                        isLink: !!event.sourceUrl && isValidUrl(event.sourceUrl),
                        url: event.sourceUrl && isValidUrl(event.sourceUrl) ? event.sourceUrl : '#'
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
