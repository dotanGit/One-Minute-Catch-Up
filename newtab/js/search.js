document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const greetingElement = document.querySelector('.greeting');
    const quickLinksGrid = document.getElementById('quickLinksGrid');
    const addShortcutModal = document.getElementById('addShortcutModal');
    const shortcutNameInput = document.getElementById('shortcutName');
    const shortcutUrlInput = document.getElementById('shortcutUrl');
    const saveShortcutButton = document.getElementById('saveShortcut');
    const cancelShortcutButton = document.getElementById('cancelShortcut');
    
    // Add new shortcuts dropdown elements
    const shortcutsButton = document.getElementById('shortcuts-button');
    const shortcutsDropdown = document.getElementById('shortcuts-dropdown');

    // Function to capitalize first letter of a string
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    // Function to get time-based greeting
    function getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 5) return 'Good night';
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        if (hour < 22) return 'Good evening';
        return 'Good night';
    }

    // Show default greeting immediately
    const defaultGreeting = getTimeBasedGreeting();
    greetingElement.textContent = defaultGreeting;

    // Function to get user info
    function getUserInfo() {
        // First check if we have stored user info
        chrome.storage.local.get(['userInfo'], function(result) {
            if (result.userInfo) {
                console.log('Using stored user info:', result.userInfo);
                const name = result.userInfo.firstName || result.userInfo.given_name || 
                           result.userInfo.fullName?.split(' ')[0] || 
                           result.userInfo.name?.split(' ')[0] || 
                           result.userInfo.email?.split('@')[0];
                
                const greeting = getTimeBasedGreeting();
                const greetingText = name ? `${greeting}, ${capitalizeFirstLetter(name)}` : greeting;
                greetingElement.textContent = greetingText;
                return;
            }

            // If no stored info, fetch from API
            chrome.runtime.sendMessage({ action: 'getUserInfo' }, function(response) {
                console.log('Full response from getUserInfo:', response);
                if (response && response.success && response.userInfo) {
                    console.log('Available name fields:', {
                        firstName: response.userInfo.firstName,
                        given_name: response.userInfo.given_name,
                        fullName: response.userInfo.fullName,
                        name: response.userInfo.name,
                        email: response.userInfo.email
                    });
                    
                    // Try different name properties in order of preference
                    let name;
                    let nameSource;

                    if (response.userInfo.firstName) {
                        name = response.userInfo.firstName;
                        nameSource = 'firstName';
                    } else if (response.userInfo.given_name) {
                        name = response.userInfo.given_name;
                        nameSource = 'given_name';
                    } else if (response.userInfo.fullName) {
                        name = response.userInfo.fullName.split(' ')[0];
                        nameSource = 'fullName split';
                    } else if (response.userInfo.name) {
                        name = response.userInfo.name.split(' ')[0];
                        nameSource = 'name split';
                    } else if (response.userInfo.email) {
                        name = response.userInfo.email.split('@')[0];
                        nameSource = 'email split';
                    }
                    
                    const greeting = getTimeBasedGreeting();
                    const greetingText = name ? `${greeting}, ${capitalizeFirstLetter(name)}` : greeting;
                    
                    console.log('Greeting selected:', { greeting, name, source: nameSource });
                    greetingElement.textContent = greetingText;

                    // Store the user info for future use
                    if (name) {
                        chrome.storage.local.set({ userInfo: response.userInfo });
                    }
                } else {
                    console.log('No user info, keeping default greeting');
                }
            });
        });
    }

    // Function to create a quick link element
    function createQuickLinkElement(shortcut, index) {
        const link = document.createElement('a');
        link.href = shortcut.url;
        link.className = 'quick-link';
        
        const icon = document.createElement('div');
        icon.className = 'quick-link-icon';
        icon.textContent = shortcut.name.charAt(0).toUpperCase();
        
        const title = document.createElement('span');
        title.className = 'quick-link-title';
        title.textContent = shortcut.name;

        // Add menu button
        const menuButton = document.createElement('button');
        menuButton.className = 'menu-button';
        menuButton.innerHTML = `
            <div class="menu-dots">
                <div class="menu-dot"></div>
                <div class="menu-dot"></div>
                <div class="menu-dot"></div>
            </div>
        `;

        // Add dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'menu-dropdown';
        dropdown.innerHTML = `
            <a class="menu-item edit-shortcut">Edit</a>
            <a class="menu-item remove-shortcut">Remove</a>
        `;

        // Prevent link click when clicking menu
        menuButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        // Handle edit click
        dropdown.querySelector('.edit-shortcut').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editShortcut(shortcut, index);
            dropdown.classList.remove('show');
        });

        // Handle remove click
        dropdown.querySelector('.remove-shortcut').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeShortcut(index);
            dropdown.classList.remove('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuButton.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        link.appendChild(icon);
        link.appendChild(title);
        link.appendChild(menuButton);
        link.appendChild(dropdown);
        return link;
    }

    // Function to edit shortcut
    function editShortcut(shortcut, index) {
        shortcutNameInput.value = shortcut.name;
        shortcutUrlInput.value = shortcut.url;
        addShortcutModal.classList.add('show');

        // Update save button to handle edit
        const handleEdit = () => {
            const name = shortcutNameInput.value.trim();
            let url = shortcutUrlInput.value.trim();
            
            if (!name || !url) return;
            
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            
            chrome.storage.local.get(['shortcuts'], function(result) {
                const shortcuts = result.shortcuts || [];
                shortcuts[index] = { name, url };
                chrome.storage.local.set({ shortcuts }, function() {
                    loadShortcuts();
                    addShortcutModal.classList.remove('show');
                    shortcutNameInput.value = '';
                    shortcutUrlInput.value = '';
                    saveShortcutButton.removeEventListener('click', handleEdit);
                });
            });
        };

        saveShortcutButton.addEventListener('click', handleEdit);
    }

    // Function to remove shortcut
    function removeShortcut(index) {
        chrome.storage.local.get(['shortcuts'], function(result) {
            const shortcuts = result.shortcuts || [];
            shortcuts.splice(index, 1);
            chrome.storage.local.set({ shortcuts }, function() {
                loadShortcuts();
            });
        });
    }

    // Function to load and display shortcuts
    function loadShortcuts() {
        chrome.storage.local.get(['shortcuts'], function(result) {
            const shortcuts = result.shortcuts || [];
            quickLinksGrid.innerHTML = '';
            
            // Add existing shortcuts
            shortcuts.forEach((shortcut, index) => {
                quickLinksGrid.appendChild(createQuickLinkElement(shortcut, index));
            });
            
            // Add the "Add" button if less than 9 shortcuts
            if (shortcuts.length < 9) {
                const addButton = document.createElement('a');
                addButton.href = '#';
                addButton.className = 'quick-link';
                
                const icon = document.createElement('div');
                icon.className = 'quick-link-icon add-icon';
                icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>`;
                
                const title = document.createElement('span');
                title.className = 'quick-link-title';
                title.textContent = 'Add Shortcut';
                
                addButton.appendChild(icon);
                addButton.appendChild(title);
                
                addButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    addShortcutModal.classList.add('show');
                });
                
                quickLinksGrid.appendChild(addButton);
            }
        });
    }

    // Event listeners for modal
    saveShortcutButton.addEventListener('click', () => {
        const name = shortcutNameInput.value.trim();
        let url = shortcutUrlInput.value.trim();
        
        if (!name || !url) return;
        
        // Add https:// if no protocol specified
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        
        chrome.storage.local.get(['shortcuts'], function(result) {
            const shortcuts = result.shortcuts || [];
            
            // Check if we've reached the maximum of 9 shortcuts
            if (shortcuts.length >= 9) {
                alert('Maximum number of shortcuts (9) reached. Please remove some shortcuts first.');
                return;
            }
            
            shortcuts.push({ name, url });
            chrome.storage.local.set({ shortcuts }, function() {
                loadShortcuts();
                addShortcutModal.classList.remove('show');
                shortcutNameInput.value = '';
                shortcutUrlInput.value = '';
            });
        });
    });

    cancelShortcutButton.addEventListener('click', () => {
        addShortcutModal.classList.remove('show');
        shortcutNameInput.value = '';
        shortcutUrlInput.value = '';
    });

    // Close modal when clicking outside
    addShortcutModal.addEventListener('click', (e) => {
        if (e.target === addShortcutModal) {
            addShortcutModal.classList.remove('show');
            shortcutNameInput.value = '';
            shortcutUrlInput.value = '';
        }
    });

    // Function to handle search
    function handleSearch(query) {
        if (!query || query.trim() === '') return;
        
        // Save the search to history
        saveSearchToHistory(query);
        
        // Hide suggestions
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
        
        // Check if it's a URL
        if (isValidUrl(query)) {
            window.location.href = query;
            return;
        }

        // If not a URL, perform Google search
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.location.href = searchUrl;
    }

    // Check if string is a valid URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Add event listeners
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch(this.value);
        }
    });

    searchButton.addEventListener('click', function() {
        handleSearch(searchInput.value);
    });

    // Initial calls
    getUserInfo();
    loadShortcuts();

    // Focus search input on page load
    searchInput.focus();

    // Function to perform search (for suggestions)
    function performSearch(query) {
        handleSearch(query);
    }
    
    // Function to save search to history
    function saveSearchToHistory(query) {
        if (!query || query.trim() === '') return;
        
        chrome.storage.local.get(['searchHistory'], function(result) {
            let searchHistory = result.searchHistory || [];
            
            // Check if query already exists
            const existingIndex = searchHistory.findIndex(item => 
                item.query.toLowerCase() === query.toLowerCase()
            );
            
            if (existingIndex !== -1) {
                // Update existing entry
                searchHistory[existingIndex].count++;
                searchHistory[existingIndex].timestamp = Date.now();
            } else {
                // Add new entry
                searchHistory.push({
                    query: query,
                    timestamp: Date.now(),
                    count: 1
                });
            }
            
            // Sort by recency and limit to 100 entries
            searchHistory.sort((a, b) => b.timestamp - a.timestamp);
            if (searchHistory.length > 100) {
                searchHistory = searchHistory.slice(0, 100);
            }
            
            // Save updated history
            chrome.storage.local.set({ searchHistory });
        });
    }
    
    // Function to get search suggestions
    function getSearchSuggestions() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['searchHistory'], function(result) {
                const searchHistory = result.searchHistory || [];
                
                // Sort by recency only (most recent first)
                const recentSearches = searchHistory
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 8)
                    .map(item => item.query);
                
                resolve(recentSearches);
            });
        });
    }
    
    // Function to get autocomplete suggestions based on current input
    function getAutocompleteSuggestions(currentInput) {
        return new Promise((resolve) => {
            if (!currentInput || currentInput.trim() === '') {
                resolve([]);
                return;
            }
            
            chrome.storage.local.get(['searchHistory'], function(result) {
                const searchHistory = result.searchHistory || [];
                
                // Get exact matches from history (starting with the input)
                const exactMatches = searchHistory
                    .filter(item => item.query.toLowerCase().startsWith(currentInput.toLowerCase()))
                    .sort((a, b) => b.timestamp - a.timestamp) // Sort by recency
                    .slice(0, 3) // Get top 3 most recent
                    .map(item => item.query);
                
                // Get related suggestions from history (contains the input)
                const relatedMatches = searchHistory
                    .filter(item => 
                        item.query.toLowerCase().includes(currentInput.toLowerCase()) && 
                        !item.query.toLowerCase().startsWith(currentInput.toLowerCase())
                    )
                    .sort((a, b) => b.timestamp - a.timestamp) // Sort by recency
                    .slice(0, 5) // Get top 5 most recent
                    .map(item => item.query);
                
                // Combine exact matches and related matches
                const combinedSuggestions = [...exactMatches, ...relatedMatches];
                
                // Limit to 8 suggestions total
                const finalSuggestions = combinedSuggestions.slice(0, 8);
                
                resolve(finalSuggestions);
            });
        });
    }
    
    // Function to display search suggestions
    function displaySearchSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('search-suggestions');
        suggestionsContainer.innerHTML = '';
        
        if (suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        suggestions.forEach(query => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            
            // Add history icon
            const historyIcon = document.createElement('img');
            historyIcon.src = 'history.svg';
            historyIcon.className = 'history-icon';
            historyIcon.alt = 'History';
            
            // Add query text
            const queryText = document.createElement('span');
            queryText.textContent = query;
            queryText.className = 'suggestion-text';
            
            // Add remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-button';
            removeButton.innerHTML = '<img src="close.svg" alt="Remove" class="remove-icon">';
            removeButton.title = 'Remove from history';
            
            // Add click event to remove the item from history
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the suggestion item click
                removeFromHistory(query);
                
                // Remove this item from the UI
                suggestionItem.remove();
                
                // If no suggestions left, hide the container
                if (suggestionsContainer.children.length === 0) {
                    suggestionsContainer.style.display = 'none';
                }
            });
            
            suggestionItem.appendChild(historyIcon);
            suggestionItem.appendChild(queryText);
            suggestionItem.appendChild(removeButton);
            
            suggestionItem.addEventListener('click', () => {
                searchInput.value = query;
                suggestionsContainer.style.display = 'none';
                performSearch(query);
            });
            
            suggestionsContainer.appendChild(suggestionItem);
        });
        
        suggestionsContainer.style.display = 'block';
    }
    
    // Function to remove an item from search history
    function removeFromHistory(query) {
        chrome.storage.local.get(['searchHistory'], function(result) {
            let searchHistory = result.searchHistory || [];
            
            // Filter out the query to remove
            searchHistory = searchHistory.filter(item => 
                item.query.toLowerCase() !== query.toLowerCase()
            );
            
            // Save updated history
            chrome.storage.local.set({ searchHistory });
        });
    }
    
    // Create suggestions container
    const searchContainer = document.querySelector('.search-container');
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'search-suggestions';
    suggestionsContainer.className = 'search-suggestions';
    searchContainer.appendChild(suggestionsContainer);
    
    // Show suggestions when clicking the search input
    searchInput.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent click from bubbling to document
        const query = this.value.trim();
        if (query === '') {
            // Show all recent suggestions when input is empty
            getSearchSuggestions().then(suggestions => {
                displaySearchSuggestions(suggestions);
            });
        } else {
            // Show autocomplete suggestions based on current input
            getAutocompleteSuggestions(query).then(suggestions => {
                displaySearchSuggestions(suggestions);
            });
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    // Handle search input
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (query === '') {
            // Show all recent suggestions when input is empty
            getSearchSuggestions().then(suggestions => {
                displaySearchSuggestions(suggestions);
            });
            return;
        }
        
        // Show autocomplete suggestions as user types
        getAutocompleteSuggestions(query).then(suggestions => {
            displaySearchSuggestions(suggestions);
        });
    });

    // Add shortcuts dropdown functionality
    if (shortcutsButton && shortcutsDropdown) {
        // Toggle shortcuts dropdown
        shortcutsButton.addEventListener('click', function(e) {
            e.stopPropagation();
            shortcutsDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!shortcutsDropdown.contains(e.target) && !shortcutsButton.contains(e.target)) {
                shortcutsDropdown.classList.remove('show');
            }
        });

        // Use the existing add shortcut functionality
        document.getElementById('add-shortcut-button')?.addEventListener('click', function() {
            addShortcutModal.classList.add('show');
            shortcutsDropdown.classList.remove('show');
        });
    }
}); 