// Account Switcher - Manages multiple logged-in accounts in different tabs
class AccountSwitcher {
  constructor() {
    this.currentAccountId = this.getCurrentAccountId();
  }

  getCurrentAccountId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('account') || sessionStorage.getItem('flowsec_account_id') || 'default';
  }

  // Get list of all logged-in accounts from localStorage
  getAllAccounts() {
    const accounts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('flowsec-session-') && key.includes('auth-token')) {
        const accountId = key.split('-')[2]; // Extract account ID from key
        try {
          const sessionData = JSON.parse(localStorage.getItem(key));
          if (sessionData && sessionData.user) {
            accounts.push({
              id: accountId,
              email: sessionData.user.email,
              userId: sessionData.user.id
            });
          }
        } catch (e) {
          console.error('Error parsing account data:', e);
        }
      }
    }
    return accounts;
  }

  // Switch to a different account (opens new tab with account parameter)
  switchToAccount(accountId) {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('account', accountId);
    window.open(currentUrl.toString(), '_blank');
  }

  // Add a new account (opens signup/login in new tab with unique account ID)
  addNewAccount() {
    const newAccountId = this.generateAccountId();
    const loginUrl = new URL(window.location.origin + '/pages/login.html');
    loginUrl.searchParams.set('account', newAccountId);
    window.open(loginUrl.toString(), '_blank');
  }

  generateAccountId() {
    return 'acc-' + Math.random().toString(36).substring(2, 15);
  }

  // Logout current account
  async logoutCurrentAccount() {
    await supabaseClient.auth.signOut();
    // Clear the account ID from session storage
    sessionStorage.removeItem('flowsec_account_id');
    // Optionally redirect to login
    window.location.href = '/pages/login.html';
  }

  // Render account switcher UI (optional, call this to show a dropdown)
  renderSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const accounts = this.getAllAccounts();
    const currentAccountId = this.currentAccountId;

    const html = `
      <div class="account-switcher">
        <div class="current-account">
          <span>Account: ${currentAccountId}</span>
          <button onclick="accountSwitcher.showAccountMenu()">⚙️</button>
        </div>
        <div class="account-menu" id="accountMenu" style="display: none;">
          <div class="account-list">
            ${accounts.map(acc => `
              <div class="account-item ${acc.id === currentAccountId ? 'active' : ''}" 
                   onclick="accountSwitcher.switchToAccount('${acc.id}')">
                ${acc.email} ${acc.id === currentAccountId ? '(current)' : ''}
              </div>
            `).join('')}
          </div>
          <button onclick="accountSwitcher.addNewAccount()">+ Add Account</button>
          <button onclick="accountSwitcher.logoutCurrentAccount()">Logout Current</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  showAccountMenu() {
    const menu = document.getElementById('accountMenu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  }
}

// Global instance
const accountSwitcher = new AccountSwitcher();
