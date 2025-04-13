export function saveSearchToHistory(query) {
    if (!query || query.trim() === '') return;
    
    chrome.storage.local.get(['searchHistory'], function(result) {
        let searchHistory = result.searchHistory || [];
        
        const existingIndex = searchHistory.findIndex(item => 
            item.query.toLowerCase() === query.toLowerCase()
        );
        
        if (existingIndex !== -1) {
            searchHistory[existingIndex].count++;
            searchHistory[existingIndex].timestamp = Date.now();
        } else {
            searchHistory.push({
                query: query,
                timestamp: Date.now(),
                count: 1
            });
        }
        
        searchHistory.sort((a, b) => b.timestamp - a.timestamp);
        if (searchHistory.length > 100) {
            searchHistory = searchHistory.slice(0, 100);
        }
        
        chrome.storage.local.set({ searchHistory });
    });
}

export function removeFromHistory(query) {
    chrome.storage.local.get(['searchHistory'], function(result) {
        let searchHistory = result.searchHistory || [];
        searchHistory = searchHistory.filter(item => 
            item.query.toLowerCase() !== query.toLowerCase()
        );
        chrome.storage.local.set({ searchHistory });
    });
}

export function getSearchSuggestions() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['searchHistory'], function(result) {
            const searchHistory = result.searchHistory || [];
            const recentSearches = searchHistory
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 8)
                .map(item => item.query);
            resolve(recentSearches);
        });
    });
}

export function getAutocompleteSuggestions(currentInput) {
    return new Promise((resolve) => {
        if (!currentInput || currentInput.trim() === '') {
            resolve([]);
            return;
        }
        
        chrome.storage.local.get(['searchHistory'], function(result) {
            const searchHistory = result.searchHistory || [];
            
            const exactMatches = searchHistory
                .filter(item => item.query.toLowerCase().startsWith(currentInput.toLowerCase()))
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 3)
                .map(item => item.query);
            
            const relatedMatches = searchHistory
                .filter(item => 
                    item.query.toLowerCase().includes(currentInput.toLowerCase()) && 
                    !item.query.toLowerCase().startsWith(currentInput.toLowerCase())
                )
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .map(item => item.query);
            
            const combinedSuggestions = [...exactMatches, ...relatedMatches];
            resolve(combinedSuggestions.slice(0, 8));
        });
    });
}
