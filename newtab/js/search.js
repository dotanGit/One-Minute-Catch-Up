document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const greetingElement = document.querySelector('.greeting');

    // Function to get time-based greeting
    function getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 5) return 'Good night';
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        if (hour < 22) return 'Good evening';
        return 'Good night';
    }

    // Function to get user info
    function getUserInfo() {
        chrome.runtime.sendMessage({ action: 'getUserInfo' }, function(response) {
            console.log('Full response from getUserInfo:', response);
            if (response && response.success && response.userInfo) {
                console.log('Available name fields:', {
                    firstName: response.userInfo.firstName,
                    given_name: response.userInfo.given_name,
                    fullName: response.userInfo.fullName,
                    name: response.userInfo.name,
                    email: response.userInfo.email
                });
                
                // Try different name properties in order of preference
                let name;
                let nameSource;

                if (response.userInfo.firstName) {
                    name = response.userInfo.firstName;
                    nameSource = 'firstName';
                } else if (response.userInfo.given_name) {
                    name = response.userInfo.given_name;
                    nameSource = 'given_name';
                } else if (response.userInfo.fullName) {
                    name = response.userInfo.fullName.split(' ')[0];
                    nameSource = 'fullName split';
                } else if (response.userInfo.name) {
                    name = response.userInfo.name.split(' ')[0];
                    nameSource = 'name split';
                } else if (response.userInfo.email) {
                    name = response.userInfo.email.split('@')[0];
                    nameSource = 'email split';
                }
                
                const greeting = getTimeBasedGreeting();
                const greetingText = name ? `${greeting}, ${name}` : greeting;
                
                console.log('Greeting selected:', { greeting, name, source: nameSource });
                greetingElement.textContent = greetingText;
            } else {
                console.log('No user info, using time-based greeting');
                // If not logged in or error, use time-based greeting
                const greeting = getTimeBasedGreeting();
                greetingElement.textContent = greeting;
            }
        });
    }

    // Initial call to get user info
    getUserInfo();

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

    // Add event listeners
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch(this.value);
        }
    });

    searchButton.addEventListener('click', function() {
        handleSearch(searchInput.value);
    });

    // Focus search input on page load
    searchInput.focus();
}); 