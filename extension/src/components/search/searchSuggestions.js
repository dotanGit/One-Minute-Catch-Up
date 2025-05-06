import { removeFromHistory } from './searchHistory.js';

export class SearchSuggestionManager {
    constructor(inputSelector = '.search-input') {
        this.input = document.querySelector(inputSelector);
        this.suggestionsContainer = document.querySelector('.search-suggestions');
        this.listElement = this.suggestionsContainer.querySelector('.suggestion-list');
        this.searchBarContainer = this.input.closest('.search-input-container');
    }

    displaySuggestions(suggestions, onSuggestionClick) {
        this.listElement.innerHTML = '';

        if (suggestions.length === 0) {
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
        const li = document.createElement('li');
        li.className = 'suggestion-list-item';

        const icon = document.createElement('img');
        icon.src = '../assets/icons/history.svg';
        icon.alt = 'History';
        icon.className = 'history-icon';

        const text = document.createElement('span');
        text.textContent = query;
        text.className = 'suggestion-text';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-button';
        removeBtn.innerHTML = '<img src="../assets/icons/close.svg" alt="Remove" class="remove-icon">';
        removeBtn.title = 'Remove from history';

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromHistory(query);
            li.remove();
            if (this.listElement.children.length === 0) {
                this.hideSuggestions();
            }
        });

        li.appendChild(icon);
        li.appendChild(text);
        li.appendChild(removeBtn);

        li.addEventListener('click', () => onSuggestionClick(query));

        return li;
    }

    showSuggestions() {
        this.suggestionsContainer.hidden = false;
        this.searchBarContainer.classList.add('showing-suggestions');
    }

    hideSuggestions() {
        this.suggestionsContainer.hidden = true;
        this.searchBarContainer.classList.remove('showing-suggestions');
    }
}
