class ShortcutsManager {
    constructor() {
        this.shortcuts = this.loadShortcuts();
        this.shortcutsSection = document.querySelector('.shortcuts-section');
        this.shortcutsButton = document.querySelector('.shortcuts-button');
        this.shortcutsList = document.querySelector('.shortcuts-list');
        this.addShortcutButton = document.querySelector('.add-shortcut-button');
        this.addShortcutModal = document.getElementById('addShortcutModal');
        this.shortcutForm = document.getElementById('shortcutForm');
        this.cancelShortcutButton = document.getElementById('cancelShortcut');

        this.initializeEventListeners();
        this.renderShortcuts();
    }

    loadShortcuts() {
        const savedShortcuts = localStorage.getItem('shortcuts');
        return savedShortcuts ? JSON.parse(savedShortcuts) : [];
    }

    saveShortcuts() {
        localStorage.setItem('shortcuts', JSON.stringify(this.shortcuts));
    }

    initializeEventListeners() {
        // Toggle shortcuts list
        this.shortcutsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.shortcutsList.classList.toggle('hidden');
        });

        // Close shortcuts when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.shortcutsSection.contains(e.target)) {
                this.shortcutsList.classList.add('hidden');
            }
        });

        // Add shortcut button
        this.addShortcutButton.addEventListener('click', () => {
            this.addShortcutModal.style.display = 'flex';
            this.shortcutForm.reset();
        });

        // Cancel adding shortcut
        this.cancelShortcutButton.addEventListener('click', () => {
            this.addShortcutModal.style.display = 'none';
            this.shortcutForm.reset();
        });

        // Handle shortcut form submission
        this.shortcutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('shortcutName').value;
            const url = document.getElementById('shortcutUrl').value;

            if (name && url) {
                if (this.editingIndex !== undefined) {
                    this.updateShortcut(this.editingIndex, { name, url });
                } else {
                    this.addShortcut({ name, url });
                }
                this.addShortcutModal.style.display = 'none';
                this.shortcutForm.reset();
                this.editingIndex = undefined;
            }
        });

        // Close modal when clicking outside
        this.addShortcutModal.addEventListener('click', (e) => {
            if (e.target === this.addShortcutModal) {
                this.addShortcutModal.style.display = 'none';
                this.shortcutForm.reset();
                this.editingIndex = undefined;
            }
        });
    }

    addShortcut(shortcut) {
        this.shortcuts.push(shortcut);
        this.saveShortcuts();
        this.renderShortcuts();
    }

    updateShortcut(index, shortcut) {
        this.shortcuts[index] = shortcut;
        this.saveShortcuts();
        this.renderShortcuts();
    }

    renderShortcuts() {
        this.shortcutsList.innerHTML = '';
        
        this.shortcuts.forEach((shortcut, index) => {
            const shortcutElement = this.createShortcutElement(shortcut, index);
            this.shortcutsList.appendChild(shortcutElement);
        });

        // Only show the add button if there are less than 7 shortcuts
        if (this.shortcuts.length < 7) {
            this.shortcutsList.appendChild(this.addShortcutButton);
        }
    }

    createShortcutElement(shortcut, index) {
        const template = document.getElementById('shortcut-item-template');
        const shortcutElement = template.content.firstElementChild.cloneNode(true);

        const link = shortcutElement.querySelector('.shortcut-link');
        link.href = shortcut.url;

        const favicon = shortcutElement.querySelector('.shortcut-favicon');
        favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(shortcut.url)}&sz=32`;
        favicon.alt = shortcut.name;

        shortcutElement.querySelector('.shortcut-name').textContent = shortcut.name;

        shortcutElement.querySelector('.edit-shortcut').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editShortcut(index);
        });

        shortcutElement.querySelector('.delete-shortcut').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.removeShortcut(index);
        });

        return shortcutElement;
    }

    editShortcut(index) {
        this.editingIndex = index;
        const shortcut = this.shortcuts[index];
        document.getElementById('shortcutName').value = shortcut.name;
        document.getElementById('shortcutUrl').value = shortcut.url;
        this.addShortcutModal.style.display = 'flex';
    }

    removeShortcut(index) {
        this.shortcuts.splice(index, 1);
        this.saveShortcuts();
        this.renderShortcuts();
    }
}

export const shortcutsManager = new ShortcutsManager();
