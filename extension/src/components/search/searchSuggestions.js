import { removeFromHistory } from './searchHistory.js';

export function createSuggestionsContainer() {
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'search-suggestions';
    suggestionsContainer.className = 'search-suggestions';
    return suggestionsContainer;
}

export function displaySearchSuggestions(suggestions, suggestionsContainer, searchBarContainer, onSuggestionClick) {
    suggestionsContainer.innerHTML = '';
    
    if (suggestions.length === 0) {
        suggestionsContainer.style.display = 'none';
        searchBarContainer.classList.remove('showing-suggestions');
        return;
    }
    
    suggestions.forEach(query => {
        const suggestionItem = createSuggestionItem(query, suggestionsContainer, onSuggestionClick);
        suggestionsContainer.appendChild(suggestionItem);
    });
    
    suggestionsContainer.style.display = 'block';
    searchBarContainer.classList.add('showing-suggestions');
}

function createSuggestionItem(query, suggestionsContainer, onSuggestionClick) {
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'suggestion-item';
    
    const historyIcon = document.createElement('img');
    historyIcon.src = '../assets/icons/history.svg';
    historyIcon.className = 'history-icon';
    historyIcon.alt = 'History';
    
    const queryText = document.createElement('span');
    queryText.textContent = query;
    queryText.className = 'suggestion-text';
    
    const removeButton = createRemoveButton(query, suggestionItem, suggestionsContainer);
    
    suggestionItem.appendChild(historyIcon);
    suggestionItem.appendChild(queryText);
    suggestionItem.appendChild(removeButton);
    
    suggestionItem.addEventListener('click', () => onSuggestionClick(query));
    
    return suggestionItem;
}

function createRemoveButton(query, suggestionItem, suggestionsContainer) {
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.innerHTML = '<img src="../assets/icons/close.svg" alt="Remove" class="remove-icon">';
    removeButton.title = 'Remove from history';
    
    removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromHistory(query);
        suggestionItem.remove();
        
        if (suggestionsContainer.children.length === 0) {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    return removeButton;
}
