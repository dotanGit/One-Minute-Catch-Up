import { isValidUrl } from './searchUtils.js';
import { saveSearchToHistory, getSearchSuggestions, getAutocompleteSuggestions } from './searchHistory.js';
import { createSuggestionsContainer, displaySearchSuggestions } from './searchSuggestions.js';
import { initializeGreeting } from './userGreeting.js';
import { initializeShortcuts } from './searchShortcuts.js';

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const searchContainer = document.querySelector('.search-container');
    const searchBarContainer = document.querySelector('.search-bar-container');
    const greetingElement = document.querySelector('.greeting');

    // Create and append suggestions container
    const suggestionsContainer = createSuggestionsContainer();
    searchContainer.appendChild(suggestionsContainer);

    function handleSearch(query) {
        if (!query || query.trim() === '') return;
        
        saveSearchToHistory(query);
        suggestionsContainer.style.display = 'none';
        searchBarContainer.classList.remove('showing-suggestions');
        
        if (isValidUrl(query)) {
            window.location.href = query;
            return;
        }

        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    // Event Listeners for search functionality
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch(e.target.value);
    });

    searchButton.addEventListener('click', () => handleSearch(searchInput.value));

    // Show suggestions when clicking the search input
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
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
}); 