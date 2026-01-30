const apiKeyInput = document.getElementById('apiKey');
const toggleKeyBtn = document.getElementById('toggleKey');
const langSelect = document.getElementById('defaultLanguage');
const modelSelect = document.getElementById('model');
const testKeyBtn = document.getElementById('testKey');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

// Populate selects
SUPPORTED_LANGUAGES.forEach((lang) => {
  const opt = document.createElement('option');
  opt.value = lang.code;
  opt.textContent = lang.name;
  langSelect.appendChild(opt);
});

AVAILABLE_MODELS.forEach((m) => {
  const opt = document.createElement('option');
  opt.value = m.id;
  opt.textContent = m.name;
  modelSelect.appendChild(opt);
});

// Load saved settings
chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  apiKeyInput.value = settings.apiKey;
  langSelect.value = settings.defaultLanguage;
  modelSelect.value = settings.model;
});

// Toggle API key visibility
toggleKeyBtn.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
});

// Show status message
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = false;
}

// Save settings
saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('Please enter an API key.', 'error');
    return;
  }

  chrome.storage.sync.set(
    {
      apiKey,
      defaultLanguage: langSelect.value,
      model: modelSelect.value,
    },
    () => {
      showStatus('Settings saved.', 'success');
    },
  );
});

// Test API key
testKeyBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('Please enter an API key first.', 'error');
    return;
  }

  testKeyBtn.disabled = true;
  testKeyBtn.textContent = 'Testing...';
  showStatus('Verifying API key...', 'info');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "ok"' }],
        max_tokens: 3,
      }),
    });

    if (response.ok) {
      showStatus('API key is valid!', 'success');
    } else if (response.status === 401) {
      showStatus('Invalid API key. Please check and try again.', 'error');
    } else {
      const data = await response.json().catch(() => ({}));
      showStatus(`API error (${response.status}): ${data.error?.message || 'Unknown error'}`, 'error');
    }
  } catch (err) {
    showStatus(`Connection error: ${err.message}`, 'error');
  } finally {
    testKeyBtn.disabled = false;
    testKeyBtn.textContent = 'Test API Key';
  }
});
