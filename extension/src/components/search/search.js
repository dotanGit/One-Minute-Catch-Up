import { saveSearchToHistory, getSearchSuggestions } from './searchHistory.js';
import { SearchSuggestionManager } from './searchSuggestions.js';


// Search functionality for the extension
class SearchHandler {
    constructor() {
        this.searchInput = document.querySelector('.search-input');
        this.searchButton = document.querySelector('.search-button');
        this.suggestionManager = new SearchSuggestionManager(
            '.search-input',
            (query) => {
                this.searchInput.value = query;
                this.performSearch();
            }
        );

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Handle search button click
        this.searchButton.addEventListener('click', () => this.performSearch());

        // Handle Enter key in search input
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Show suggestions when input is focused or clicked
        this.searchInput.addEventListener('focus', async () => {
            const suggestions = await getSearchSuggestions();
            this.suggestionManager.displaySuggestions(suggestions);
        });
    }

    performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        saveSearchToHistory(query);

        // Use Chrome's Search API which respects user's default search engine
        chrome.search.query({
            text: query,
            disposition: 'NEW_TAB'
        });
    }
}

// Initialize search functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SearchHandler();
});

