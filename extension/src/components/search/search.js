import { isValidUrl } from './searchUtils.js';
import { saveSearchToHistory, getSearchSuggestions, getAutocompleteSuggestions } from './searchHistory.js';
import { createSuggestionsContainer, displaySearchSuggestions } from './searchSuggestions.js';
import { initializeShortcuts } from './searchShortcuts.js';
import { searchEngineManager } from './searchEngines.js';

// Search functionality for the extension
class SearchHandler {
    constructor() {
        this.searchInput = document.querySelector('.search-input');
        this.searchButton = document.querySelector('.search-button');
        this.currentEngineIcon = document.getElementById('current-engine-icon');
        this.engineOptions = document.querySelector('.engine-options');
        this.engineSelector = document.querySelector('.engine-button');
        
        // Initialize with the first engine from the list
        this.currentEngine = searchEngineManager.engines[0].engine;
        this.currentEngineIcon.src = searchEngineManager.engines[0].icon;
        this.currentEngineIcon.alt = searchEngineManager.engines[0].name;
        
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

        // Handle engine selector click
        this.engineSelector.addEventListener('click', () => {
            this.engineOptions.hidden = !this.engineOptions.hidden;
        });

        // Handle engine selection and actions
        this.engineOptions.addEventListener('click', (e) => {
            const engineOption = e.target.closest('.engine-option');
            if (!engineOption) return;

            const engine = engineOption.dataset.engine;
            
            if (e.target.closest('.edit-engine')) {
                this.handleEditEngine(engine);
            } else {
                this.switchSearchEngine(engine);
            }
        });

        // Close engine options when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.engineSelector.contains(e.target) && !this.engineOptions.contains(e.target)) {
                this.engineOptions.hidden = true;
            }
        });
    }

    performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        const engine = searchEngineManager.getEngine(this.currentEngine);
        if (!engine) return;

        const searchUrl = engine.url.replace('{query}', encodeURIComponent(query));
        window.location.href = searchUrl;
    }

    switchSearchEngine(engine) {
        const engineData = searchEngineManager.getEngine(engine);
        if (!engineData) return;

        this.currentEngine = engine;
        this.currentEngineIcon.src = engineData.icon;
        this.currentEngineIcon.alt = engineData.name;
        this.engineOptions.hidden = true;
    }

    handleEditEngine(engine) {
        const clickedOption = event.target.closest('.engine-option');
        searchEngineManager.showEngineSelection(engine, clickedOption);
    }
}

// Initialize search functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SearchHandler();
});

