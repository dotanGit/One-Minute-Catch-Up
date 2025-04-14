import { isValidUrl } from './searchUtils.js';
import { saveSearchToHistory, getSearchSuggestions, getAutocompleteSuggestions } from './searchHistory.js';
import { createSuggestionsContainer, displaySearchSuggestions } from './searchSuggestions.js';
import { initializeGreeting } from './userGreeting.js';
import { initializeShortcuts } from './searchShortcuts.js';

document.addEventListener('DOMContentLoaded', function() {
    let currentEngine = 'google';
    // Get DOM elements
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const searchContainer = document.querySelector('.search-container');
    const searchBarContainer = document.querySelector('.search-bar-container');
    const greetingElement = document.querySelector('.greeting');

    // Create and append suggestions container
    const suggestionsContainer = createSuggestionsContainer();
    document.body.appendChild(suggestionsContainer);

    function handleSearch(query) {
        if (!query || query.trim() === '') return;
    
        saveSearchToHistory(query);
        suggestionsContainer.style.display = 'none';
        searchBarContainer.classList.remove('showing-suggestions');
    
        if (isValidUrl(query)) {
            window.location.href = query;
            return;
        }
    
        if (currentEngine === 'google') {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        } else if (currentEngine === 'chatgpt') {
            window.location.href = `https://chat.openai.com/?q=${encodeURIComponent(query)}`;
        } else if (currentEngine === 'reddit') {
            window.location.href = `https://www.reddit.com/search?q=${encodeURIComponent(query)}`;
        } else if (currentEngine === 'youtube') {
            window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        }
    }
    
    

    // Event Listeners for search functionality
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch(e.target.value);
    });

    searchButton.addEventListener('click', () => handleSearch(searchInput.value));

    // Show suggestions when clicking the search input
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close shortcuts dropdown if it's open
        const shortcutsDropdown = document.getElementById('shortcuts-dropdown');
        if (shortcutsDropdown) {
            shortcutsDropdown.classList.remove('show');
        }

        const query = e.target.value.trim();
        const suggestionsPromise = query === '' ? 
            getSearchSuggestions() : 
            getAutocompleteSuggestions(query);
            
        suggestionsPromise.then(suggestions => {
            displaySearchSuggestions(
                suggestions, 
                suggestionsContainer, 
                searchBarContainer, 
                (query) => {
                    searchInput.value = query;
                    handleSearch(query);
                }
            );
            });
        });

    // Handle search input changes
    searchInput.addEventListener('input', (e) => {
        // Close shortcuts dropdown if it's open
        const shortcutsDropdown = document.getElementById('shortcuts-dropdown');
        if (shortcutsDropdown) {
            shortcutsDropdown.classList.remove('show');
        }

        const query = e.target.value.trim();
        const suggestionsPromise = query === '' ? 
            getSearchSuggestions() : 
            getAutocompleteSuggestions(query);
            
        suggestionsPromise.then(suggestions => {
            displaySearchSuggestions(
                suggestions, 
                suggestionsContainer, 
                searchBarContainer, 
                (query) => {
                    searchInput.value = query;
                    handleSearch(query);
                }
            );
        });
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
            searchBarContainer.classList.remove('showing-suggestions');
        }
    });

    // Initialize other components
    initializeGreeting(greetingElement);
    initializeShortcuts();

    // Focus search input on page load
    searchInput.focus();

    const searchEngineIcon = document.getElementById('search-engine-icon');
    const engineDropdown = document.getElementById('engine-dropdown');

    searchEngineIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        engineDropdown.style.display = engineDropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-engine-selector')) {
            engineDropdown.style.display = 'none';
        }
    });

    document.querySelectorAll('.engine-option').forEach(option => {
        option.addEventListener('click', (event) => {
            currentEngine = event.currentTarget.getAttribute('data-engine');
            updateSearchEngineIcon();
            engineDropdown.style.display = 'none';
        });
    });

    function updateSearchEngineIcon() {
        const iconMap = {
            google: '../assets/icons/google.png',
            chatgpt: '../assets/icons/chatgpt.png',
            reddit: '../assets/icons/reddit.png',
            youtube: '../assets/icons/youtube.png'
        };
        searchEngineIcon.src = iconMap[currentEngine];
    
        // ✅ Update placeholder text based on selected engine
        if (currentEngine === 'google') {
            searchInput.placeholder = 'Search Google or type a URL';
        } else if (currentEngine === 'chatgpt') {
            searchInput.placeholder = 'Ask ChatGPT anything...';
        } else if (currentEngine === 'reddit') {
            searchInput.placeholder = 'Search Reddit...';
        } else if (currentEngine === 'youtube') {
            searchInput.placeholder = 'Search Youtube...';
        }
    }


    // Add this after getting DOM elements
    function updateSuggestionsPosition() {
        const searchBarRect = searchBarContainer.getBoundingClientRect();
        document.documentElement.style.setProperty('--search-bar-top', `${searchBarRect.top}px`);
    }

    // Call on page load and window resize
    updateSuggestionsPosition();
    window.addEventListener('resize', updateSuggestionsPosition);
}); 