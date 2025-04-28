export function getEventDetails(event) {
    switch (event.type) {
        case 'drive':
            return {
                title: event.title,
                details: [
                    { 
                        value: event.description,
                        isLink: true,
                        url: event.webViewLink || '#'
                    }
                ]
            };
        case 'download':
            return {
                title: 'Download',
                details: [
                    { 
                        value: event.actualTitle,
                        isLink: true,
                        onClick: async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            try {
                                // First try to open using downloadId
                                await chrome.downloads.open(event.id);
                            } catch (error) {
                                console.log('Failed to open with downloadId:', error);
                                
                                try {
                                    // Try to check if file exists
                                    const searchResults = await chrome.downloads.search({
                                        filename: event.actualTitle,
                                        exists: true
                                    });

                                    if (searchResults.length > 0) {
                                        try {
                                            await chrome.downloads.open(searchResults[0].id);
                                            return;
                                        } catch (secondError) {
                                            throw new Error('File exists but cannot be opened');
                                        }
                                    } else {
                                        throw new Error('File not found');
                                    }
                                } catch (searchError) {
                                    // If we get here, try to redownload
                                    if (event.downloadUrl && !event.downloadUrl.startsWith('blob:')) {
                                        const confirmRedownload = window.confirm(
                                            'The file could not be found. Would you like to download it again?'
                                        );
                                        
                                        if (confirmRedownload) {
                                            try {
                                                await chrome.downloads.download({ url: event.downloadUrl });
                                            } catch (downloadError) {
                                                alert('Failed to redownload the file. The download link may no longer be valid.');
                                            }
                                        }
                                    } else {
                                        alert('Sorry, this file cannot be opened or redownloaded. It might have been moved, deleted, or the download link has expired.');
                                    }
                                }
                            }
                        }
                    }
                ]
            };
        case 'browser':
            return {
                title: event.title,
                details: [
                    { 
                        value: event.actualTitle || 'No title',
                        isLink: true,
                        url: event.url
                    }
                ]
            };
        case 'email':
            return {
                title: event.title,
                details: [
                    { 
                        value: event.subject || 'No subject',
                        isLink: true,
                        url: event.emailUrl || '#'
                    }
                ]
            };
        case 'calendar':
            return {
                title: event.title,
                details: [
                    { 
                        value: event.description || 'Untitled event',
                        isLink: true,
                        url: event.eventUrl || '#'
                    }
                ]
            };
        default:
            return {
                title: event.title || 'Browser Activity',
                details: [
                    { 
                        value: event.description,
                        isLink: true,
                        url: event.url || '#'
                    }
                ]
            };
    }
}
