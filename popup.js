const SETTINGS_KEY = 'validator_settings';
const INVALID_BOOKMARKS_KEY = 'invalid_bookmarks';
const IS_CHECKING_KEY = 'is_checking';
const SVG_NS = 'http://www.w3.org/2000/svg';

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
        let failedCount = 0;

        for (const bm of bookmarks) {
            try {
                await new Promise((resolve, reject) => {
                    chrome.bookmarks.remove(bm.id, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                });
                deletedCount++;
            } catch (err) {
                console.error('Failed to remove bookmark:', bm.id, err);
                failedCount++;
            }
        }

        // Clear storage after attempting deletion
        await chrome.storage.local.set({ [INVALID_BOOKMARKS_KEY]: [] });

        // Clear UI instantly
        invalidList.innerHTML = '';
        invalidCount.textContent = '0';
        emptyState.classList.remove('hidden');
        clearAllBtn.classList.add('hidden');

        clearAllBtn.disabled = false;

        if (failedCount > 0) {
            alert(`Deleted ${deletedCount} bookmark(s). Failed to delete ${failedCount} bookmark(s).`);
        } else {
            alert(`Deleted ${deletedCount} bookmark(s).`);
        }
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

function createDeleteIcon() {
    const svgIcon = document.createElementNS(SVG_NS, 'svg');
    svgIcon.setAttribute('width', '16');
    svgIcon.setAttribute('height', '16');
    svgIcon.setAttribute('viewBox', '0 0 24 24');
    svgIcon.setAttribute('fill', 'none');
    svgIcon.setAttribute('stroke', 'currentColor');
    svgIcon.setAttribute('stroke-width', '2');
    svgIcon.setAttribute('stroke-linecap', 'round');
    svgIcon.setAttribute('stroke-linejoin', 'round');

    const path1 = document.createElementNS(SVG_NS, 'path');
    path1.setAttribute('d', 'M3 6h18');
    const path2 = document.createElementNS(SVG_NS, 'path');
    path2.setAttribute('d', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6');
    const path3 = document.createElementNS(SVG_NS, 'path');
    path3.setAttribute('d', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2');
    const line1 = document.createElementNS(SVG_NS, 'line');
    line1.setAttribute('x1', '10');
    line1.setAttribute('y1', '11');
    line1.setAttribute('x2', '10');
    line1.setAttribute('y2', '17');
    const line2 = document.createElementNS(SVG_NS, 'line');
    line2.setAttribute('x1', '14');
    line2.setAttribute('y1', '11');
    line2.setAttribute('x2', '14');
    line2.setAttribute('y2', '17');

    svgIcon.append(path1, path2, path3, line1, line2);
    return svgIcon;
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

        const infoDiv = document.createElement('div');
        infoDiv.className = 'bookmark-info';

        const titleEl = document.createElement('h3');
        titleEl.title = bm.title || bm.url;
        titleEl.textContent = bm.title || 'Untitled';

        const linkEl = document.createElement('a');
        linkEl.href = bm.url;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener';
        linkEl.className = 'bookmark-url';
        linkEl.title = bm.url;
        linkEl.textContent = bm.url;

        const reasonEl = document.createElement('span');
        reasonEl.className = 'bookmark-error';
        reasonEl.textContent = bm.reason || 'Error';

        infoDiv.appendChild(titleEl);
        infoDiv.appendChild(linkEl);
        infoDiv.appendChild(reasonEl);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.dataset.id = bm.id;
        deleteBtn.title = 'Remove Bookmark';
        deleteBtn.appendChild(createDeleteIcon());

        deleteBtn.addEventListener('click', async () => {
            deleteBtn.disabled = true;
            try {
                await new Promise((resolve, reject) => {
                    chrome.bookmarks.remove(bm.id, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                });

                // Remove from UI and storage only after successful deletion
                const newData = bookmarks.filter(b => b.id !== bm.id);
                await chrome.storage.local.set({ [INVALID_BOOKMARKS_KEY]: newData });

                // Remove the list item from DOM instantly
                li.remove();

                // Update count header
                invalidCount.textContent = newData.length;
                if (newData.length === 0) {
                    emptyState.classList.remove('hidden');
                    clearAllBtn.classList.add('hidden');
                }
            } catch (err) {
                console.error('Failed to remove bookmark:', err);
                alert('Could not remove bookmark. It might have already been deleted.');
                deleteBtn.disabled = false;
            }
        });

        li.appendChild(infoDiv);
        li.appendChild(deleteBtn);
        invalidList.appendChild(li);
    });
}
