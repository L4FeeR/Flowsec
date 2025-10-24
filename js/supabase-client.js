const { createClient } = supabase;

// Enable multi-account support: use custom storage with session isolation
// This allows multiple users to be logged in simultaneously in different tabs
function getStorageKey() {
  // Use URL parameter or tab-specific identifier to isolate sessions
  const params = new URLSearchParams(window.location.search);
  const accountId = params.get('account') || sessionStorage.getItem('flowsec_account_id') || 'default';
  
  // Store the account ID in session storage (tab-specific)
  if (!sessionStorage.getItem('flowsec_account_id')) {
    sessionStorage.setItem('flowsec_account_id', accountId);
  }
  
  return `flowsec-session-${accountId}`;
}

// Custom storage adapter that uses tab-specific keys
const customStorage = {
  getItem: (key) => {
    const storageKey = key.includes('auth') ? `${getStorageKey()}-${key}` : key;
    return sessionStorage.getItem(storageKey);
  },
  setItem: (key, value) => {
    const storageKey = key.includes('auth') ? `${getStorageKey()}-${key}` : key;
    sessionStorage.setItem(storageKey, value);
  },
  removeItem: (key) => {
    const storageKey = key.includes('auth') ? `${getStorageKey()}-${key}` : key;
    sessionStorage.removeItem(storageKey);
  }
};

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});