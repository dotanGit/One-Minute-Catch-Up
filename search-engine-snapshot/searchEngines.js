// Predefined search engines
const PREDEFINED_ENGINES = {
    google: {
        name: 'Google',
        engine: 'google',
        icon: '../assets/icons/search-engines/google.png',
        url: 'https://www.google.com/search?q={query}',
        placeholder: 'Search Google or type a URL'
    },
    chatgpt: {
        name: 'ChatGPT',
        engine: 'chatgpt',
        icon: '../assets/icons/search-engines/chatgpt.png',
        url: 'https://chatgpt.com/?q={query}&hints=search',
        placeholder: 'Ask ChatGPT anything...'
    },
    reddit: {
        name: 'Reddit',
        engine: 'reddit',
        icon: '../assets/icons/search-engines/reddit.png',
        url: 'https://www.reddit.com/search/?q={query}',
        placeholder: 'Search Reddit...'
    },
    youtube: {
        name: 'YouTube',
        engine: 'youtube',
        icon: '../assets/icons/search-engines/youtube.png',
        url: 'https://www.youtube.com/results?search_query={query}',
        placeholder: 'Search YouTube...'
    },
    yahoo: {
        name: 'Yahoo Finance',
        engine: 'yahoo-finance',
        icon: '../assets/icons/search-engines/stocks.png',
        url: 'https://finance.yahoo.com/lookup?s={query}',
        placeholder: 'Search stocks, companies...'
    },
    quora: {
        name: 'Quora',
        engine: 'quora',
        icon: '../assets/icons/search-engines/quora.png',
        url: 'https://www.quora.com/search?q={query}',
        placeholder: 'Ask a question on Quora...'
    }
};

class SearchEngineManager {
    constructor() {
        this.engines = this.loadEngines();
        this.engineOptions = document.querySelector('.engine-options');
        this.initializeEngineOptions();
        this.initializeGridSelection();
    }

    loadEngines() {
        const savedEngines = localStorage.getItem('searchEngines');
        if (savedEngines) {
            const parsedEngines = JSON.parse(savedEngines);
            // Ensure each engine has a placeholder by merging with PREDEFINED_ENGINES
            return parsedEngines.map(engine => ({
                ...PREDEFINED_ENGINES[engine.engine],
                ...engine
            }));
        }
        return [PREDEFINED_ENGINES.google, PREDEFINED_ENGINES.chatgpt, PREDEFINED_ENGINES.reddit];
    }

    saveEngines() {
        // Only save essential properties to localStorage
        const enginesToSave = this.engines.map(({ engine, name, icon, url }) => ({
            engine,
            name,
            icon,
            url
        }));
        localStorage.setItem('searchEngines', JSON.stringify(enginesToSave));
    }

    getEngine(engineName) {
        return this.engines.find(e => e.engine === engineName);
    }

    initializeEngineOptions() {
        const engineOptions = document.querySelectorAll('.engine-option');
        
        // Clear existing data
        engineOptions.forEach(option => {
            option.dataset.engine = '';
            const img = option.querySelector('img');
            img.src = '';
            img.alt = '';
        });
        
        // Populate with current engines
        this.engines.forEach((engine, index) => {
            if (index < engineOptions.length) {
                const option = engineOptions[index];
                option.dataset.engine = engine.engine;
                const img = option.querySelector('img');
                img.src = engine.icon;
                img.alt = engine.name;
            }
        });
    }

    initializeGridSelection() {
        const modal = document.getElementById('selectEngineModal');
        const gridItems = modal.querySelectorAll('.engine-grid-item');
        const cancelButton = modal.querySelector('#cancelEngine');
        const searchInput = document.querySelector('.search-input');

        gridItems.forEach(item => {
            item.addEventListener('click', () => {
                const newEngine = item.dataset.engine;
                const engineData = PREDEFINED_ENGINES[newEngine];
                
                // Find the index of the clicked option in the list
                const clickedIndex = Array.from(document.querySelectorAll('.engine-option')).indexOf(this.clickedOption);
                
                if (clickedIndex !== -1) {
                    // Replace the clicked engine with the new one
                    this.engines[clickedIndex] = engineData;
                    this.saveEngines();
                    this.initializeEngineOptions();
                    
                    // Update the current engine icon and placeholder if this was the active engine
                    const currentEngineIcon = document.getElementById('current-engine-icon');
                    if (currentEngineIcon && clickedIndex === 0) {
                        currentEngineIcon.src = engineData.icon;
                        currentEngineIcon.alt = engineData.name;
                        this.currentEngine = newEngine;
                        searchInput.placeholder = engineData.placeholder;
                    }
                }
                
                modal.style.display = 'none';
            });
        });

        cancelButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    showEngineSelection(currentEngine, clickedOption) {
        this.currentEngine = currentEngine;
        this.clickedOption = clickedOption;
        const modal = document.getElementById('selectEngineModal');
        const gridItems = modal.querySelectorAll('.engine-grid-item');
        
        // Highlight the current engine if provided
        gridItems.forEach(item => {
            if (currentEngine && item.dataset.engine === currentEngine) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        modal.style.display = 'flex';
    }
}

export const searchEngineManager = new SearchEngineManager(); 