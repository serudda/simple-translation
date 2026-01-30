const langSelect = document.getElementById('targetLang');
const translateBtn = document.getElementById('translateBtn');
const restoreBtn = document.getElementById('restoreBtn');
const progressDiv = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const noKeyMsg = document.getElementById('noKeyMsg');
const openSettingsLink = document.getElementById('openSettings');
const controlsDiv = document.getElementById('controls');
const errorMsg = document.getElementById('errorMsg');

// Populate language select
SUPPORTED_LANGUAGES.forEach((lang) => {
  const opt = document.createElement('option');
  opt.value = lang.code;
  opt.textContent = lang.name;
  langSelect.appendChild(opt);
});

// Load settings and check for API key
chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  langSelect.value = settings.defaultLanguage;

  if (!settings.apiKey) {
    noKeyMsg.hidden = false;
    controlsDiv.hidden = true;
  }
});

// Query content script for current state on popup open
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    updateUI(response);
  });
});

// Listen for progress updates from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRANSLATION_PROGRESS') {
    updateUI(message);
  }
});

function updateUI(state) {
  if (state.status === 'translating') {
    translateBtn.disabled = true;
    translateBtn.textContent = 'Translating...';
    restoreBtn.hidden = true;
    progressDiv.hidden = false;
    const pct = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;
    progressFill.style.width = pct + '%';
    progressText.textContent = `Translating... ${state.completed}/${state.total} chunks`;
  } else if (state.status === 'done') {
    translateBtn.disabled = false;
    translateBtn.textContent = 'Translate Page';
    restoreBtn.hidden = false;
    progressDiv.hidden = true;
  } else if (state.status === 'error') {
    translateBtn.disabled = false;
    translateBtn.textContent = 'Translate Page';
    progressDiv.hidden = true;
    showError(state.error || 'Translation failed');
  } else {
    // idle
    translateBtn.disabled = false;
    translateBtn.textContent = 'Translate Page';
    restoreBtn.hidden = true;
    progressDiv.hidden = true;
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

// Open settings page
openSettingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Translate button
translateBtn.addEventListener('click', () => {
  errorMsg.hidden = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    translateBtn.disabled = true;
    translateBtn.textContent = 'Starting...';

    chrome.tabs.sendMessage(
      tabs[0].id,
      {
        type: 'START_TRANSLATION',
        targetLang: langSelect.value,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          showError('Cannot connect to this page. Try refreshing.');
          translateBtn.disabled = false;
          translateBtn.textContent = 'Translate Page';
          return;
        }
        if (response?.error) {
          showError(response.error);
          translateBtn.disabled = false;
          translateBtn.textContent = 'Translate Page';
        }
      },
    );
  });
});

// Restore button
restoreBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'RESTORE_ORIGINAL' });
    restoreBtn.hidden = true;
    errorMsg.hidden = true;
  });
});
