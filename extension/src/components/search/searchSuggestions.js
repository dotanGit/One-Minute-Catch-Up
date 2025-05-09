import { removeFromHistory, getSearchSuggestions, getAutocompleteSuggestions } from './searchHistory.js';

export class SearchSuggestionManager {
    constructor(inputSelector = '.search-input', onSearch) {
        this.input = document.querySelector(inputSelector);
        this.suggestionsContainer = document.querySelector('.search-suggestions');
        this.listElement = this.suggestionsContainer.querySelector('.suggestion-list');
        this.searchBarContainer = this.input.closest('.search-input-container');
        this.searchSection = this.input.closest('.search-section');
        this.shortcutsButton = document.querySelector('.shortcuts-button');
        this.showTimeout = null;
        this.onSearch = onSearch;
        
        // Add input event listener for real-time suggestions
        this.input.addEventListener('input', async () => {
            const currentInput = this.input.value.trim();
            if (currentInput) {
                const suggestions = await getAutocompleteSuggestions(currentInput);
                this.displaySuggestions(suggestions);
            } else {
                // If input is empty, show recent searches
                const suggestions = await getSearchSuggestions();
                this.displaySuggestions(suggestions);
            }
        });

        // Add click outside listener
        document.addEventListener('click', (e) => {
            if (!this.suggestionsContainer.contains(e.target) && 
                e.target !== this.input) {
                this.hideSuggestions();
            }
        });

        // Add specific handler for shortcuts button
        if (this.shortcutsButton) {
            this.shortcutsButton.addEventListener('click', () => {
                this.hideSuggestions();
            });
        }

        // Add focus handler for search input
        this.input.addEventListener('focus', () => {
            // First hide other elements immediately
            const shortcutsList = document.querySelector('.shortcuts-list');
            const engineOptions = document.querySelector('.engine-options');
            if (shortcutsList) shortcutsList.classList.add('hidden');
            if (engineOptions) engineOptions.hidden = true;
            
            // Then show suggestions with delay
            if (this.showTimeout) {
                clearTimeout(this.showTimeout);
            }
            this.showTimeout = setTimeout(() => {
                this.showSuggestions();
            }, 100);
        });
    }

    displaySuggestions(suggestions, onSuggestionClick) {
        this.listElement.innerHTML = '';

        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        suggestions.forEach(query => {
            const item = this.createSuggestionListItem(query, onSuggestionClick);
            this.listElement.appendChild(item);
        });

        this.showSuggestions();
    }

    createSuggestionListItem(query, onSuggestionClick) {
        const template = document.getElementById('suggestion-item-template');
        const li = template.content.cloneNode(true).querySelector('.suggestion-list-item');
        
        // Set the text content
        li.querySelector('.suggestion-text').textContent = query;
        
        // Add click handler for the remove button
        const removeBtn = li.querySelector('.remove-button');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromHistory(query);
            li.remove();
            if (this.listElement.children.length === 0) {
                this.hideSuggestions();
            }
        });

        // Add click handler for the entire item
        li.addEventListener('click', () => {
            this.input.value = query;
            this.hideSuggestions();
            if (this.onSearch) {
                this.onSearch(query);
            }
        });

        return li;
    }

    showSuggestions() {
        if (this.listElement.children.length > 0) {
            this.suggestionsContainer.hidden = false;
            this.searchBarContainer.classList.add('showing-suggestions');
        } else {
            this.hideSuggestions();
        }
    }

    hideSuggestions() {
        this.suggestionsContainer.hidden = true;
        this.searchBarContainer.classList.remove('showing-suggestions');
    }
}
