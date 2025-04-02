document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');

    // Function to handle search
    function handleSearch(query) {
        if (!query) return;
        
        // Check if the input is a URL
        if (isValidUrl(query)) {
            window.location.href = query;
            return;
        }

        // If not a URL, perform Google search
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.location.href = searchUrl;
    }

    // Check if string is a valid URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Handle search button click
    searchButton.addEventListener('click', function() {
        handleSearch(searchInput.value.trim());
    });

    // Handle Enter key press
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch(searchInput.value.trim());
        }
    });

    // Focus search input on page load
    searchInput.focus();
}); 