# One Minute Catch-Up Chrome Extension

A Chrome extension that provides a daily summary of your activities and upcoming events, helping you stay organized and informed.

## Features

- Daily summary of yesterday's activities:
  - Most visited websites
  - Documents edited in Google Drive
  - Emails sent
- Today's calendar events
- AI-generated summary of your activities
- Automatic daily updates
- Clean, modern interface

## Setup Instructions

1. Clone this repository or download the source code.

2. Set up Google Cloud Project:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the following APIs:
     - Google Drive API
     - Gmail API
     - Google Calendar API
   - Create OAuth 2.0 credentials
   - Add your extension's ID to the authorized origins

3. Set up OpenAI API:
   - Go to [OpenAI](https://openai.com/) and create an account
   - Generate an API key
   - Keep this key secure

4. Configure the extension:
   - Open `manifest.json` and replace `${YOUR_CLIENT_ID}` with your Google OAuth client ID
   - Open `background.js` and replace:
     - `${YOUR_API_KEY}` with your Google API key
     - `${YOUR_OPENAI_API_KEY}` with your OpenAI API key

5. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar
2. Sign in with your Google account when prompted
3. View your daily summary, which includes:
   - Yesterday's activities
   - AI-generated summary of your work
   - Today's calendar events

The summary updates automatically once per day when you first open Chrome.

## Privacy

This extension:
- Only requests read-only access to your Google services
- Stores data locally in your browser
- Does not share your data with any third parties
- Uses OpenAI's API only for generating activity summaries

## Development

To modify or enhance the extension:

1. Make your changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Test your changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 