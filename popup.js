const SETTINGS_KEY = 'validator_settings';
const INVALID_BOOKMARKS_KEY = 'invalid_bookmarks';
const IS_CHECKING_KEY = 'is_checking';

const checkBtn = document.getElementById('check-btn');
const settingsBtn = document.getElementById('settings-btn');
const statusContainer = document.getElementById('status-container');
const progressFill = document.getElementById('progress-fill');
const statusText = document.getElementById('status-text');
const invalidList = document.getElementById('invalid-list');
const invalidCount = document.getElementById('invalid-count');
const emptyState = document.getElementById('empty-state');
const clearAllBtn = document.getElementById('clear-all-btn');

// Load initial state
document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get([INVALID_BOOKMARKS_KEY, IS_CHECKING_KEY]);

    if (data[IS_CHECKING_KEY]) {
        setCheckingState(true);
    } else {
        setCheckingState(false);
    }

    renderBookmarks(data[INVALID_BOOKMARKS_KEY] || []);
});

// Listen for storage changes to update UI dynamically
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        if (changes[IS_CHECKING_KEY]) {
            setCheckingState(changes[IS_CHECKING_KEY].newValue);
        }
        if (changes[INVALID_BOOKMARKS_KEY]) {
            renderBookmarks(changes[INVALID_BOOKMARKS_KEY].newValue || []);
        }
    }
});

// Listen for progress messages from background
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'VALIDATION_PROGRESS') {
        statusText.textContent = `Checking: ${message.completed} / ${message.total}`;
        const percentage = (message.completed / message.total) * 100;
        progressFill.style.width = `${percentage}%`;
    } else if (message.action === 'VALIDATION_COMPLETED') {
        setCheckingState(false);
    }
});

checkBtn.addEventListener('click', () => {
    setCheckingState(true);
    statusText.textContent = 'Starting validation...';
    progressFill.style.width = '0%';

    chrome.runtime.sendMessage({ action: 'START_VALIDATION' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            setCheckingState(false);
            alert('Error starting validation.');
        }
    });
});

settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

clearAllBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all invalid bookmarks?')) {
        clearAllBtn.disabled = true;
        const data = await chrome.storage.local.get(INVALID_BOOKMARKS_KEY);
        const bookmarks = data[INVALID_BOOKMARKS_KEY] || [];

        let deletedCount = 0;
        for (const bm of bookmarks) {
            try {
                await chrome.bookmarks.remove(bm.id);
                deletedCount++;
            } catch (err) {
                console.error('Failed to remove bookmark:', bm.id, err);
            }
        }

        // Clear storage after attempting deletion
        await chrome.storage.local.set({ [INVALID_BOOKMARKS_KEY]: [] });
        clearAllBtn.disabled = false;
        alert(`Deleted ${deletedCount} bookmark(s).`);
    }
});

function setCheckingState(isChecking) {
    if (isChecking) {
        checkBtn.disabled = true;
        checkBtn.textContent = 'Checking...';
        statusContainer.classList.remove('hidden');
    } else {
        checkBtn.disabled = false;
        checkBtn.textContent = 'Start Validation';
        statusContainer.classList.add('hidden');
        progressFill.style.width = '0%';
    }
}

function renderBookmarks(bookmarks) {
    invalidList.innerHTML = '';
    invalidCount.textContent = bookmarks.length;

    if (bookmarks.length === 0) {
        emptyState.classList.remove('hidden');
        clearAllBtn.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    clearAllBtn.classList.remove('hidden');

    bookmarks.forEach(bm => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';

        li.innerHTML = `
      <div class="bookmark-info">
        <h3 title="${bm.title || bm.url}">${bm.title || 'Untitled'}</h3>
        <a href="${bm.url}" target="_blank" class="bookmark-url" title="${bm.url}">${bm.url}</a>
        <span class="bookmark-error">${bm.reason || 'Error'}</span>
      </div>
      <button class="delete-btn" data-id="${bm.id}" title="Remove Bookmark">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    `;

        li.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.target.disabled = true;
            try {
                await chrome.bookmarks.remove(bm.id);
                // Remove from UI and storage
                const newData = bookmarks.filter(b => b.id !== bm.id);
                await chrome.storage.local.set({ [INVALID_BOOKMARKS_KEY]: newData });
            } catch (err) {
                console.error('Failed to remove bookmark:', err);
                alert('Could not remove bookmark. It might have already been deleted.');
                e.target.disabled = false;
            }
        });

        invalidList.appendChild(li);
    });
}
