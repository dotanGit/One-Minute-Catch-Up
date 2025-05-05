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

        // Menu button logic
        const menuBtn = shortcutElement.querySelector('.shortcut-menu-btn');
        const menuDropdown = shortcutElement.querySelector('.shortcut-menu-dropdown');

        menuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isOpen = shortcutElement.classList.contains('menu-open');

            // Close all other open dropdowns
            document.querySelectorAll('.shortcut-item.menu-open').forEach(item => {
                if (item !== shortcutElement) {
                    item.classList.remove('menu-open');
                    const dropdown = item.querySelector('.shortcut-menu-dropdown');
                    const link = item.querySelector('.shortcut-link');
                    if (dropdown) dropdown.style.display = 'none';
                    if (link) link.style.display = '';
                }
            });

            if (isOpen) {
                menuDropdown.style.display = 'none';
                link.style.display = '';
                shortcutElement.classList.remove('menu-open');
            } else {
                menuDropdown.style.display = 'flex';
                link.style.display = 'none';
                shortcutElement.classList.add('menu-open');
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function handler(e) {
            if (!shortcutElement.contains(e.target)) {
                menuDropdown.style.display = 'none';
                link.style.display = '';
                shortcutElement.classList.remove('menu-open');
            }
        });

        // Edit and Delete logic
        menuDropdown.querySelector('.edit-shortcut').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editShortcut(index);
            menuDropdown.style.display = 'none';
            link.style.display = '';
            shortcutElement.classList.remove('menu-open');
        });

        menuDropdown.querySelector('.delete-shortcut').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.removeShortcut(index);
            // No need to show link, as item will be removed
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
