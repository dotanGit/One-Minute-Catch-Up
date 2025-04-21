// greeting/greetingStorage.js
export async function saveGreeting(dateKey, greetingText) {
    await chrome.storage.local.set({ [`greeting_${dateKey}`]: greetingText });
    console.log('[Greeting] Saved in storage:', dateKey, greetingText);

  }
  
  export async function getGreeting(dateKey) {
    const result = await chrome.storage.local.get([`greeting_${dateKey}`]);
    return result[`greeting_${dateKey}`] || null;
  }
  