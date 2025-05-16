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
        this.highlightedIndex = -1;
        this.suggestions = [];

        
        // Add mousedown outside listener
        document.addEventListener('mousedown', (e) => {
            // Only hide if clicking outside both the input and suggestions container
            if (!this.suggestionsContainer.contains(e.target) && 
                !this.searchBarContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // Add focus handler for search input
        this.input.addEventListener('focus', async () => {
            this.keepFocused();
            const shortcutsList = document.querySelector('.shortcuts-list');
            const engineOptions = document.querySelector('.engine-options');
            if (shortcutsList) shortcutsList.classList.add('hidden');
            if (engineOptions) engineOptions.hidden = true;
            
            if (this.showTimeout) {
                clearTimeout(this.showTimeout);
            }
            this.showTimeout = setTimeout(() => {
                this.showSuggestions();
            }, 100);
        });

        // Add input handler to update suggestions while typing
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

        // Add specific handler for shortcuts button
        if (this.shortcutsButton) {
            this.shortcutsButton.addEventListener('click', () => {
                this.hideSuggestions();
            });
        }

        this.input.addEventListener('blur', () => {
            this.searchSection.classList.remove('focused');
        });

        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    keepFocused() {
        this.searchSection.classList.add('focused');
    }

    displaySuggestions(suggestions, onSuggestionClick) {
        this.listElement.innerHTML = '';
        this.suggestions = suggestions;
        this.highlightedIndex = -1;

        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        suggestions.forEach(query => {
            const item = this.createSuggestionListItem(query, this.onSearch);
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
            
            // Check if there are still suggestions left
            if (this.listElement.children.length === 0) {
                this.hideSuggestions();
            } else {
                // Keep the focused state if there are still suggestions
                this.keepFocused();
            }
        });

        // Add click handler for the entire item
        li.addEventListener('click', () => onSuggestionClick(query));

        return li;
    }

    showSuggestions() {
        this.keepFocused();
        if (this.listElement.children.length > 0) {
            this.suggestionsContainer.hidden = false;
            this.searchBarContainer.classList.add('showing-suggestions');
        } else {
            this.suggestionsContainer.hidden = true;
            this.searchBarContainer.classList.remove('showing-suggestions');
        }
    }

    hideSuggestions() {
        this.suggestionsContainer.hidden = true;
        this.searchBarContainer.classList.remove('showing-suggestions');
        // Only remove focused if input is not focused and suggestions are hidden
        if (document.activeElement !== this.input) {
            this.searchSection.classList.remove('focused');
        }
    }

    handleKeyDown(e) {
        const items = this.listElement.querySelectorAll('.suggestion-list-item');
        if (!items.length) return;
    
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.highlightedIndex = (this.highlightedIndex + 1) % items.length;
            this.updateHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.highlightedIndex = (this.highlightedIndex - 1 + items.length) % items.length;
            this.updateHighlight(items);
        } else if (e.key === 'Enter') {
            if (this.highlightedIndex >= 0 && this.highlightedIndex < this.suggestions.length) {
                this.onSearch(this.suggestions[this.highlightedIndex]);
            }
        }
    }
    
    updateHighlight(items) {
        items.forEach(item => item.classList.remove('highlighted'));
        if (this.highlightedIndex >= 0) {
            items[this.highlightedIndex].classList.add('highlighted');
            items[this.highlightedIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}
