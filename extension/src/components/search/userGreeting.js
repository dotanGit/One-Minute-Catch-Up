import { capitalizeFirstLetter, getTimeBasedGreeting } from './searchUtils.js';

export function initializeGreeting(greetingElement) {
    // Show default greeting immediately
    const defaultGreeting = getTimeBasedGreeting();
    greetingElement.textContent = defaultGreeting;
    
    // Get user info and update greeting
    getUserInfo(greetingElement);
}

function getUserInfo(greetingElement) {
    chrome.storage.local.get(['userInfo'], function(result) {
        if (result.userInfo) {
            updateGreetingWithUserInfo(result.userInfo, greetingElement);
            return;
        }

        // If no stored info, fetch from API
        chrome.runtime.sendMessage({ action: 'getUserInfo' }, function(response) {
            if (response && response.success && response.userInfo) {
                updateGreetingWithUserInfo(response.userInfo, greetingElement);
                // Store the user info for future use
                chrome.storage.local.set({ userInfo: response.userInfo });
            }
        });
    });
}

function updateGreetingWithUserInfo(userInfo, greetingElement) {
    const name = userInfo.firstName || 
                userInfo.given_name || 
                userInfo.fullName?.split(' ')[0] || 
                userInfo.name?.split(' ')[0] || 
                userInfo.email?.split('@')[0];
    
    const greeting = getTimeBasedGreeting();
    const greetingText = name ? `${greeting}, ${capitalizeFirstLetter(name)}` : greeting;
    greetingElement.textContent = greetingText;
}
