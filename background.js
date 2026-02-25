// background.js

const VALIDATION_ALARM = 'bookmark-validation-alarm';
const SETTINGS_KEY = 'validator_settings';
const INVALID_BOOKMARKS_KEY = 'invalid_bookmarks';
const IS_CHECKING_KEY = 'is_checking';

// Initialize defaults if not set
chrome.runtime.onInstalled.addListener(async () => {
  const currentSettings = await chrome.storage.local.get(SETTINGS_KEY);
  if (!currentSettings[SETTINGS_KEY]) {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        checkOnStartup: false,
        schedulePeriodMinutes: 0 // 0 means disabled
      },
      [INVALID_BOOKMARKS_KEY]: [],
      [IS_CHECKING_KEY]: false
    });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  const settings = data[SETTINGS_KEY];

  if (settings && settings.checkOnStartup) {
    startValidation();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === VALIDATION_ALARM) {
    startValidation();
  }
});

// Update alarms when settings change
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[SETTINGS_KEY]) {
    const newSettings = changes[SETTINGS_KEY].newValue;
    const oldSettings = changes[SETTINGS_KEY].oldValue;

    // Check if period changed
    if (newSettings?.schedulePeriodMinutes !== oldSettings?.schedulePeriodMinutes) {
      chrome.alarms.clear(VALIDATION_ALARM);
      if (newSettings.schedulePeriodMinutes > 0) {
        chrome.alarms.create(VALIDATION_ALARM, {
          periodInMinutes: newSettings.schedulePeriodMinutes
        });
      }
    }
  }
});

// Message listener for manual triggers from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_VALIDATION') {
    startValidation().then(() => sendResponse({ status: 'started' }));
    return true; // Keep message channel open for async response
  }
});

async function getAllBookmarks() {
  const bookmarks = await chrome.bookmarks.getTree();
  const allUrls = [];

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.url) {
        // We only want to check http/https links
        if (node.url.startsWith('http')) {
          allUrls.push({
            id: node.id,
            title: node.title,
            url: node.url,
            parentId: node.parentId
          });
        }
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(bookmarks);
  return allUrls;
}

// Keep track of the current check to prevent multiple concurrent checks
let isCheckingLocal = false;

async function startValidation() {
  if (isCheckingLocal) return;

  isCheckingLocal = true;
  await chrome.storage.local.set({ [IS_CHECKING_KEY]: true });

  try {
    const bookmarks = await getAllBookmarks();
    const invalidBookmarks = [];

    // Use a concurrency limit to avoid overwhelming the network or getting blocked
    const CONCURRENCY_LIMIT = 5;
    let i = 0;

    while (i < bookmarks.length) {
      const chunk = bookmarks.slice(i, i + CONCURRENCY_LIMIT);

      const promises = chunk.map(async (bm) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

          const response = await fetch(bm.url, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-cache',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });
          clearTimeout(timeoutId);

          // We don't need the body, so cancel it to prevent downloading large files
          if (response.body) {
            await response.body.cancel().catch(() => { });
          }

          if (!response.ok) {
            // Exclude 403 and 401 as those are often just anti-bot protections, but the domain/page exists
            if (response.status !== 403 && response.status !== 401) {
              invalidBookmarks.push({
                ...bm,
                statusCode: response.status,
                reason: `HTTP ${response.status}`
              });
            }
          }
        } catch (error) {
          // fetch failed entirely (e.g. domain not found, timeout, aborted)
          invalidBookmarks.push({
            ...bm,
            statusCode: 0,
            reason: error.name === 'AbortError' ? 'Timeout' : 'Network Error'
          });
        }
      });

      await Promise.all(promises);
      i += CONCURRENCY_LIMIT;

      // Update progress in storage if we wanted to show a progress bar
      // (Simplified for now, just sending message to active popup if any)
      chrome.runtime.sendMessage({
        action: 'VALIDATION_PROGRESS',
        completed: Math.min(i, bookmarks.length),
        total: bookmarks.length
      }).catch(() => { }); // catch error if no popup is listening
    }

    // Save invalid bookmarks
    await chrome.storage.local.set({ [INVALID_BOOKMARKS_KEY]: invalidBookmarks });

    const count = invalidBookmarks.length;
    const message = count === 0
      ? 'All bookmarks are valid!'
      : `Found ${count} invalid bookmark${count === 1 ? '' : 's'}.`;

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Bookmark Validation Complete',
      message
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Notification error:', chrome.runtime.lastError.message);
      }
    });
  } finally {
    isCheckingLocal = false;
    await chrome.storage.local.set({ [IS_CHECKING_KEY]: false });
    chrome.runtime.sendMessage({ action: 'VALIDATION_COMPLETED' }).catch(() => { });
  }
}
