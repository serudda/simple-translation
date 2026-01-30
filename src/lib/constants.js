const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
];

const AVAILABLE_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Recommended)' },
  { id: 'gpt-4o', name: 'GPT-4o' },
];

const TOKEN_LIMIT = 2500;
const CHARS_PER_TOKEN = 4;
const MAX_CHUNK_CHARS = TOKEN_LIMIT * CHARS_PER_TOKEN;

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

const MAX_TEXT_NODES_WARNING = 50000;

const CACHE_DB_NAME = 'PageTranslatorCache';
const CACHE_STORE_NAME = 'translations';
const CACHE_DB_VERSION = 1;

const DEFAULT_SETTINGS = {
  apiKey: '',
  defaultLanguage: 'es',
  model: 'gpt-4o-mini',
};
