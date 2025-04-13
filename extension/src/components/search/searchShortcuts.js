export function initializeShortcuts() {
    const elements = {
        quickLinksGrid: document.getElementById('quickLinksGrid'),
        addShortcutModal: document.getElementById('addShortcutModal'),
        shortcutNameInput: document.getElementById('shortcutName'),
        shortcutUrlInput: document.getElementById('shortcutUrl'),
        saveShortcutButton: document.getElementById('saveShortcut'),
        cancelShortcutButton: document.getElementById('cancelShortcut'),
        shortcutsButton: document.getElementById('shortcuts-button'),
        shortcutsDropdown: document.getElementById('shortcuts-dropdown')
    };

    // Initialize shortcuts
    loadShortcuts(elements);
    setupEventListeners(elements);
}

function setupEventListeners(elements) {
    const {
        addShortcutModal,
        shortcutNameInput,
        shortcutUrlInput,
        saveShortcutButton,
        cancelShortcutButton,
        shortcutsButton,
        shortcutsDropdown
    } = elements;

    // Shortcuts button click
    shortcutsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        shortcutsDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!shortcutsDropdown.contains(e.target) && !shortcutsButton.contains(e.target)) {
            shortcutsDropdown.classList.remove('show');
        }
    });

    // Save shortcut
    saveShortcutButton.addEventListener('click', () => {
        handleSaveShortcut(elements);
    });

    // Cancel shortcut
    cancelShortcutButton.addEventListener('click', () => {
        handleCancelShortcut(elements);
    });

    // Close modal when clicking outside
    addShortcutModal.addEventListener('click', (e) => {
        if (e.target === addShortcutModal) {
            handleCancelShortcut(elements);
        }
    });
}

function loadShortcuts(elements) {
    const { quickLinksGrid, addShortcutModal } = elements;
    
    chrome.storage.local.get(['shortcuts'], function(result) {
        const shortcuts = result.shortcuts || [];
        quickLinksGrid.innerHTML = '';
        
        // Add existing shortcuts
        shortcuts.forEach((shortcut, index) => {
            quickLinksGrid.appendChild(createQuickLinkElement(shortcut, index, elements));
        });
        
        // Add the "Add" button if less than 9 shortcuts
        if (shortcuts.length < 9) {
            addCreateShortcutButton(quickLinksGrid, addShortcutModal);
        }
    });
}

function createQuickLinkElement(shortcut, index, elements) {
    const link = document.createElement('a');
    link.href = shortcut.url;
    link.className = 'quick-link';
    
    const icon = document.createElement('div');
    icon.className = 'quick-link-icon';
    icon.textContent = shortcut.name.charAt(0).toUpperCase();
    
    const title = document.createElement('span');
    title.className = 'quick-link-title';
    title.textContent = shortcut.name;

    // Add menu button and dropdown
    const { menuButton, dropdown } = createQuickLinkMenu(shortcut, index, elements);
    
    link.appendChild(icon);
    link.appendChild(title);
    link.appendChild(menuButton);
    link.appendChild(dropdown);
    
    return link;
}

function createQuickLinkMenu(shortcut, index, elements) {
    const menuButton = document.createElement('button');
    menuButton.className = 'menu-button';
    menuButton.innerHTML = `
        <div class="menu-dots">
            <div class="menu-dot"></div>
            <div class="menu-dot"></div>
            <div class="menu-dot"></div>
        </div>
    `;

    const dropdown = document.createElement('div');
    dropdown.className = 'menu-dropdown';
    dropdown.innerHTML = `
        <a class="menu-item edit-shortcut">Edit</a>
        <a class="menu-item remove-shortcut">Remove</a>
    `;

    setupQuickLinkMenuListeners(menuButton, dropdown, shortcut, index, elements);

    return { menuButton, dropdown };
}

function setupQuickLinkMenuListeners(menuButton, dropdown, shortcut, index, elements) {
    menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close other dropdowns
        document.querySelectorAll('.menu-dropdown.show').forEach(menu => {
            if (menu !== dropdown) {
                menu.classList.remove('show');
            }
        });
        
        dropdown.classList.toggle('show');
    });

    dropdown.querySelector('.edit-shortcut').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editShortcut(shortcut, index, elements);
        dropdown.classList.remove('show');
    });

    dropdown.querySelector('.remove-shortcut').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeShortcut(index, elements);
        dropdown.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
        if (!menuButton.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function addCreateShortcutButton(quickLinksGrid, addShortcutModal) {
    const addButton = document.createElement('a');
    addButton.href = '#';
    addButton.className = 'quick-link';
    
    const icon = document.createElement('div');
    icon.className = 'quick-link-icon add-icon';
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
    </svg>`;
    
    const title = document.createElement('span');
    title.className = 'quick-link-title';
    title.textContent = 'Add Shortcut';
    
    addButton.appendChild(icon);
    addButton.appendChild(title);
    
    addButton.addEventListener('click', (e) => {
        e.preventDefault();
        addShortcutModal.classList.add('show');
    });
    
    quickLinksGrid.appendChild(addButton);
}

function handleSaveShortcut(elements) {
    const { quickLinksGrid, addShortcutModal, shortcutNameInput, shortcutUrlInput } = elements;
    
    const name = shortcutNameInput.value.trim();
    let url = shortcutUrlInput.value.trim();
    
    if (!name || !url) return;
    
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    
    chrome.storage.local.get(['shortcuts'], function(result) {
        const shortcuts = result.shortcuts || [];
        
        if (shortcuts.length >= 9) {
            alert('Maximum number of shortcuts (9) reached. Please remove some shortcuts first.');
            return;
        }
        
        shortcuts.push({ name, url });
        chrome.storage.local.set({ shortcuts }, function() {
            loadShortcuts(elements);
            handleCancelShortcut(elements);
        });
    });
}

function handleCancelShortcut(elements) {
    const { addShortcutModal, shortcutNameInput, shortcutUrlInput } = elements;
    addShortcutModal.classList.remove('show');
    shortcutNameInput.value = '';
    shortcutUrlInput.value = '';
}

function editShortcut(shortcut, index, elements) {
    const { addShortcutModal, shortcutNameInput, shortcutUrlInput, saveShortcutButton } = elements;
    
    shortcutNameInput.value = shortcut.name;
    shortcutUrlInput.value = shortcut.url;
    addShortcutModal.classList.add('show');

    const handleEdit = () => {
        const name = shortcutNameInput.value.trim();
        let url = shortcutUrlInput.value.trim();
        
        if (!name || !url) return;
        
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        
        chrome.storage.local.get(['shortcuts'], function(result) {
            const shortcuts = result.shortcuts || [];
            shortcuts[index] = { name, url };
            chrome.storage.local.set({ shortcuts }, function() {
                loadShortcuts(elements);
                handleCancelShortcut(elements);
                saveShortcutButton.removeEventListener('click', handleEdit);
            });
        });
    };

    saveShortcutButton.addEventListener('click', handleEdit);
}

function removeShortcut(index, elements) {
    chrome.storage.local.get(['shortcuts'], function(result) {
        const shortcuts = result.shortcuts || [];
        shortcuts.splice(index, 1);
        chrome.storage.local.set({ shortcuts }, function() {
            loadShortcuts(elements);
        });
    });
}
