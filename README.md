# Bookmarks Validator

A Chrome extension that finds and removes broken or unavailable bookmarks.

## Features

- **Manual validation** – Start a bookmark check on demand from the extension popup.
- **Startup check** – Optionally validate bookmarks every time Chrome starts.
- **Scheduled checks** – Run automatic background checks every hour, day, or week.
- **One-click removal** – Delete individual broken bookmarks or all of them at once.
- **Progress tracking** – Real-time progress bar during validation.

## Installation

### From source (developer mode)

1. Clone the repository:
   ```bash
   git clone https://github.com/necobm/bookmark-validator.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the cloned repository folder.
5. The **Bookmarks Validator** icon will appear in your toolbar.

## Usage

1. Click the extension icon in the Chrome toolbar to open the popup.
2. Click **Start Validation** to check all bookmarks.
3. Invalid bookmarks (unreachable URLs) are listed with the reason for failure.
4. Remove individual entries with the delete button next to each bookmark, or use **Delete All** to remove every invalid bookmark at once.
5. Click ⚙️ to open **Settings** and configure automatic checks:
   - **Check on browser startup** – validates bookmarks whenever Chrome opens.
   - **Scheduled Checks** – choose hourly, daily, or weekly background validation.

## Contributing

Contributions are welcome! Here is how to get started:

1. **Fork** the repository and create a new branch for your change:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and test them by loading the extension in developer mode (see [Installation](#installation)).
3. **Open a pull request** describing what you changed and why.

Please keep pull requests focused on a single concern and include a clear description of the problem being solved.

## License

This project is licensed under the [MIT License](LICENSE).
