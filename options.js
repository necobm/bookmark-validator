const SETTINGS_KEY = 'validator_settings';

const startupCb = document.getElementById('check-startup-cb');
const scheduleSelect = document.getElementById('schedule-select');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = data[SETTINGS_KEY] || { checkOnStartup: false, schedulePeriodMinutes: 0 };

    startupCb.checked = settings.checkOnStartup;
    scheduleSelect.value = settings.schedulePeriodMinutes.toString();
});

saveBtn.addEventListener('click', async () => {
    const newSettings = {
        checkOnStartup: startupCb.checked,
        schedulePeriodMinutes: parseInt(scheduleSelect.value, 10)
    };

    await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });

    saveStatus.style.display = 'block';
    setTimeout(() => {
        saveStatus.style.display = 'none';
    }, 2000);
});
