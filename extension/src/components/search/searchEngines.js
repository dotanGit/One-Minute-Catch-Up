// Predefined search engines
const PREDEFINED_ENGINES = {
    google: {
        name: 'Google',
        engine: 'google',
        icon: '../assets/icons/google.png',
        url: 'https://www.google.com/search?q={query}'
    },
    chatgpt: {
        name: 'ChatGPT',
        engine: 'chatgpt',
        icon: '../assets/icons/chatgpt.png',
        url: 'https://chatgpt.com/?q={query}&hints=search'
    },
    reddit: {
        name: 'Reddit',
        engine: 'reddit',
        icon: '../assets/icons/reddit.png',
        url: 'https://www.reddit.com/search/?q={query}'
    },
    youtube: {
        name: 'YouTube',
        engine: 'youtube',
        icon: '../assets/icons/youtube.png',
        url: 'https://www.youtube.com/results?search_query={query}'
    },
    wikipedia: {
        name: 'Wikipedia',
        engine: 'wikipedia',
        icon: '../assets/icons/wikipedia.png',
        url: 'https://en.wikipedia.org/w/index.php?search={query}'
    },
    github: {
        name: 'GitHub',
        engine: 'github',
        icon: '../assets/icons/github.png',
        url: 'https://github.com/search?q={query}'
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
        return savedEngines ? JSON.parse(savedEngines) : [PREDEFINED_ENGINES.google, PREDEFINED_ENGINES.chatgpt, PREDEFINED_ENGINES.reddit];
    }

    saveEngines() {
        localStorage.setItem('searchEngines', JSON.stringify(this.engines));
    }

    addEngine(engineName) {
        if (PREDEFINED_ENGINES[engineName]) {
            // Find the engine to replace (the one that was clicked)
            const currentEngine = this.engines.find(e => e.engine === engineName);
            if (!currentEngine) {
                // If we have less than 3 engines, add the new one
                if (this.engines.length < 3) {
                    this.engines.push(PREDEFINED_ENGINES[engineName]);
                }
            } else {
                // Replace the current engine with the selected one
                const index = this.engines.indexOf(currentEngine);
                this.engines[index] = PREDEFINED_ENGINES[engineName];
            }
            this.saveEngines();
            this.initializeEngineOptions();
        }
    }

    deleteEngine(engineName) {
        this.engines = this.engines.filter(e => e.engine !== engineName);
        this.saveEngines();
        this.initializeEngineOptions();
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
            const span = option.querySelector('span');
            img.src = '';
            img.alt = '';
            span.textContent = '';
        });
        
        // Populate with current engines
        this.engines.forEach((engine, index) => {
            if (index < engineOptions.length) {
                const option = engineOptions[index];
                option.dataset.engine = engine.engine;
                const img = option.querySelector('img');
                const span = option.querySelector('span');
                img.src = engine.icon;
                img.alt = engine.name;
                span.textContent = engine.name;
            }
        });
    }

    initializeGridSelection() {
        const modal = document.getElementById('selectEngineModal');
        const gridItems = modal.querySelectorAll('.engine-grid-item');
        const cancelButton = modal.querySelector('#cancelEngine');

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
                    
                    // Update the current engine icon if this was the active engine or the first engine
                    if (this.clickedOption.dataset.engine === this.currentEngine || clickedIndex === 0) {
                        const currentEngineIcon = document.getElementById('current-engine-icon');
                        if (currentEngineIcon) {
                            currentEngineIcon.src = engineData.icon;
                            currentEngineIcon.alt = engineData.name;
                        }
                        // Update the current engine if it's the first one
                        if (clickedIndex === 0) {
                            this.currentEngine = newEngine;
                        }
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
        this.clickedOption = clickedOption; // Store which option was clicked
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