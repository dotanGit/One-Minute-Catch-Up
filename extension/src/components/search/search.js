import { isValidUrl } from './searchUtils.js';
import { saveSearchToHistory, getSearchSuggestions, getAutocompleteSuggestions } from './searchHistory.js';
import { createSuggestionsContainer, displaySearchSuggestions } from './searchSuggestions.js';
import { initializeGreeting } from './userGreeting.js';
import { initializeShortcuts } from './searchShortcuts.js';

document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const searchContainer = document.querySelector('.search-container');
    const searchBarContainer = document.querySelector('.search-bar-container');
    const greetingElement = document.querySelector('.greeting');
    const addEngineModal = document.getElementById('addEngineModal');
    const saveEngineButton = document.getElementById('saveEngine');
    const cancelEngineButton = document.getElementById('cancelEngine');
    const searchEngineIcon = document.getElementById('search-engine-icon');
    const engineDropdown = document.getElementById('engine-dropdown');

    let currentEngine = 'google';
    let searchEngines = [];
    let editingEngine = null;

    const engineTemplates = {
        'google.com': 'https://www.google.com/search?q=QUERY',
        'youtube.com': 'https://www.youtube.com/results?search_query=QUERY',
        'reddit.com': 'https://www.reddit.com/search/?q=QUERY',
        'chat.openai.com': 'https://chat.openai.com/?q=QUERY',
        'wikipedia.org': 'https://en.wikipedia.org/wiki/Special:Search?search=QUERY',
        'stackoverflow.com': 'https://stackoverflow.com/search?q=QUERY'
    };

    function deleteEngine(engineValue) {
        searchEngines = searchEngines.filter(e => e.value !== engineValue);
        saveEngines();
        buildEngineDropdown();
    }

    function editEngine(engine) {
        document.getElementById('engineName').value = engine.name;
        document.getElementById('engineUrl').value = new URL(engine.url).hostname;
        document.getElementById('engineIcon').value = engine.icon;
        editingEngine = engine.value;
        openEngineModal();
    }

    function loadEngines() {
        const storedEngines = JSON.parse(localStorage.getItem('searchEngines')) || [
            { name: 'Google', value: 'google', url: 'https://www.google.com/search?q=QUERY', icon: '../assets/icons/google.png' },
            { name: 'ChatGPT', value: 'chatgpt', url: 'https://chat.openai.com/?q=QUERY', icon: '../assets/icons/chatgpt.png' },
            { name: 'Reddit', value: 'reddit', url: 'https://www.reddit.com/search/?q=QUERY', icon: '../assets/icons/reddit.png' }
        ];

        searchEngines = storedEngines;

        const lastSelected = localStorage.getItem('lastSelectedEngine');
        if (lastSelected) {
            currentEngine = lastSelected;
        }

        buildEngineDropdown();
        updateSearchEngineIcon();
    }

    function saveEngines() {
        localStorage.setItem('searchEngines', JSON.stringify(searchEngines));
    }

    function buildEngineDropdown() {
        engineDropdown.innerHTML = '';

        searchEngines.forEach(engine => {
            const option = document.createElement('div');
            option.classList.add('engine-option');
            option.innerHTML = `
                <img src="${engine.icon}" alt="${engine.name} Icon">
                <span>${engine.name}</span>
                <span class="engine-actions">
                    <button class="edit-engine" data-engine="${engine.value}">✏️</button>
                    <button class="delete-engine" data-engine="${engine.value}">🗑️</button>
                </span>
            `;

            option.querySelector('.delete-engine').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this search engine?')) {
                    deleteEngine(engine.value);
                }
            });

            option.querySelector('.edit-engine').addEventListener('click', (e) => {
                e.stopPropagation();
                editEngine(engine);
            });

            option.addEventListener('click', () => {
                currentEngine = engine.value;
                localStorage.setItem('lastSelectedEngine', currentEngine);
                updateSearchEngineIcon();
                engineDropdown.classList.remove('show');
            });

            engineDropdown.appendChild(option);
        });

        const separator = document.createElement('div');
        separator.className = 'dropdown-separator';
        engineDropdown.appendChild(separator);

        if (searchEngines.length < 5) {
            const addNewOption = document.createElement('div');
            addNewOption.classList.add('engine-option');
            addNewOption.innerHTML = `<span style="margin-right: 8px;">➕</span> Add New Engine`;
            addNewOption.addEventListener('click', openEngineModal);
            engineDropdown.appendChild(addNewOption);
        }
    }

    function updateSearchEngineIcon() {
        const selected = searchEngines.find(e => e.value === currentEngine);
        if (!selected) return;
        searchEngineIcon.src = selected.icon;

        if (selected.value === 'google') {
            searchInput.placeholder = 'Search Google or type a URL';
        } else if (selected.value === 'chatgpt') {
            searchInput.placeholder = 'Ask ChatGPT anything...';
        } else if (selected.value === 'reddit') {
            searchInput.placeholder = 'Search Reddit forums...';
        } else {
            searchInput.placeholder = `Search ${selected.name}...`;
        }
    }

    function handleSearch(query) {
        if (!query || query.trim() === '') return;

        saveSearchToHistory(query);
        suggestionsContainer.style.display = 'none';
        searchBarContainer.classList.remove('showing-suggestions');

        if (isValidUrl(query)) {
            window.location.href = query;
            return;
        }

        const selected = searchEngines.find(e => e.value === currentEngine);
        if (selected) {
            const searchUrl = selected.url.replace('QUERY', encodeURIComponent(query));
            window.location.href = searchUrl;
        }
    }

    cancelEngineButton.addEventListener('click', closeEngineModal);

    saveEngineButton.addEventListener('click', () => {
        const name = document.getElementById('engineName').value.trim();
        let urlInput = document.getElementById('engineUrl').value.trim();
        const iconInput = document.getElementById('engineIcon').value.trim();
        let finalIcon = iconInput;

        if (!name || !urlInput) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            if (!urlInput.startsWith('http')) {
                urlInput = 'https://' + urlInput;
            }

            const urlObj = new URL(urlInput);
            const hostname = urlObj.hostname.replace('www.', '');
            const template = engineTemplates[hostname];

            if (!template) {
                alert('Unsupported engine. Please choose from supported list.');
                return;
            }

            if (!iconInput) {
                finalIcon = `https://www.google.com/s2/favicons?sz=64&domain_url=${urlInput}`;
            }

            const value = name.toLowerCase().replace(/\s+/g, '-');

            if (editingEngine) {
                const index = searchEngines.findIndex(e => e.value === editingEngine);
                if (index !== -1) {
                    searchEngines[index] = { name, value, url: template, icon: finalIcon };
                }
                editingEngine = null;
            } else {
                if (searchEngines.length >= 5) {
                    alert('You can only have up to 5 search engines.');
                    return;
                }
                searchEngines.push({ name, value, url: template, icon: finalIcon });
            }

            saveEngines();
            buildEngineDropdown();
            closeEngineModal();
        } catch (error) {
            alert('Invalid URL. Please check and try again.');
        }
    });

    function openEngineModal() {
        addEngineModal.classList.add('show');
    }

    function closeEngineModal() {
        addEngineModal.classList.remove('show');
        document.getElementById('engineName').value = '';
        document.getElementById('engineUrl').value = '';
        document.getElementById('engineIcon').value = '';
        editingEngine = null;
    }

    searchEngineIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        engineDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-engine-selector')) {
            engineDropdown.classList.remove('show');
        }
    });

    const suggestionsContainer = createSuggestionsContainer();
    document.body.appendChild(suggestionsContainer);

    function showSuggestions(query) {
        const suggestionsPromise = query === ''
            ? getSearchSuggestions()
            : getAutocompleteSuggestions(query);

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
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch(e.target.value);
    });

    searchButton.addEventListener('click', () => handleSearch(searchInput.value));

    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        const shortcutsDropdown = document.getElementById('shortcuts-dropdown');
        if (shortcutsDropdown) shortcutsDropdown.classList.remove('show');
        showSuggestions(e.target.value.trim());
    });

    searchInput.addEventListener('input', (e) => {
        const shortcutsDropdown = document.getElementById('shortcuts-dropdown');
        if (shortcutsDropdown) shortcutsDropdown.classList.remove('show');
        showSuggestions(e.target.value.trim());
    });

    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
            searchBarContainer.classList.remove('showing-suggestions');
        }
    });

    initializeGreeting(greetingElement);
    initializeShortcuts();

    searchInput.focus();

    function updateSuggestionsPosition() {
        const searchBarRect = searchBarContainer.getBoundingClientRect();
        document.documentElement.style.setProperty('--search-bar-top', `${searchBarRect.top}px`);
    }

    updateSuggestionsPosition();
    window.addEventListener('resize', updateSuggestionsPosition);

    loadEngines();
});
