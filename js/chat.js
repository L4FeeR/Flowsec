// Chat Dashboard JavaScript

let currentUser = null;
let selectedUser = null;
let allUsers = [];
let privateKey = null; // Store decrypted private key in memory

// Initialize chat on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Chat dashboard initializing...');
    
    // Load theme preference
    loadTheme();
    
    // Check authentication
    await checkAuth();
    
    // Load current user profile
    await loadCurrentUser();
    
    // Load user's private key
    await loadPrivateKey();
    
    // Load all users
    await loadUsers();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Chat dashboard initialized');
});

// Check if user is authenticated
async function checkAuth() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
        console.log('Not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('User authenticated:', session.user.email);
}

// Load current user profile
async function loadCurrentUser() {
    try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        
        if (authError) throw authError;
        
        // Get profile from database
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.error('Profile error:', profileError);
            // Use basic user info if profile not found
            currentUser = {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || 'User',
                username: user.user_metadata?.username || user.email.split('@')[0]
            };
        } else {
            currentUser = profile;
        }
        
        // Update UI
        updateCurrentUserUI();
        
    } catch (error) {
        console.error('Error loading current user:', error);
    }
}

// Update current user UI
function updateCurrentUserUI() {
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (currentUser) {
        userName.textContent = currentUser.name || currentUser.username;
        
        if (currentUser.avatar_url) {
            userAvatar.src = currentUser.avatar_url;
        } else {
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || currentUser.username)}&background=4CAF50&color=fff`;
        }
        
        // Show encryption status
        if (currentUser.public_key) {
            console.log('🔐 E2EE enabled for user');
        }
    }
}

// Load user's private key from localStorage
async function loadPrivateKey() {
    try {
        if (!currentUser) return;
        
        // Check if private key exists
        if (!EncryptionService.hasPrivateKey(currentUser.id)) {
            console.warn('⚠️ No private key found. User may need to regenerate keys.');
            return;
        }
        
        // Get user's email as password
        const { data: { user } } = await supabaseClient.auth.getUser();
        const password = user.email;
        
        // Retrieve and decrypt private key
        privateKey = await EncryptionService.retrievePrivateKey(currentUser.id, password);
        console.log('🔐 Private key loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading private key:', error);
        // Show warning to user
        showEncryptionWarning();
    }
}

// Load all users
async function loadUsers() {
    try {
        console.log('🔍 Loading users from database...');
        console.log('Current user ID:', currentUser?.id);
        console.log('Current user object:', currentUser);
        
        // First, get ALL users to see what's in database
        const { data: allDbUsers, error: allError } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('📊 ALL users in database:', allDbUsers);
        console.log('Total users count:', allDbUsers?.length || 0);
        
        // Now get users excluding current user
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .neq('id', currentUser.id)
            .order('created_at', { ascending: false });
        
        console.log('📊 Other users (excluding me):', users);
        console.log('Database query result:', { users, error });
        
        if (error) throw error;
        
        allUsers = users || [];
        
        console.log('✅ Loaded users:', allUsers.length);
        console.log('🔐 Users with E2EE:', allUsers.filter(u => u.public_key).length);
        console.log('👥 User details:', allUsers.map(u => ({ 
            id: u.id, 
            name: u.name, 
            username: u.username,
            hasKeys: !!u.public_key 
        })));
        
        displayUsers(allUsers);
        
        if (allUsers.length === 0) {
            console.warn('⚠️ No other users found in database');
            console.log('💡 Tip: You need at least 2 accounts to see users in the list');
            console.log('🔍 Check: Are you the only user? Total DB users:', allDbUsers?.length || 0);
        }
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        document.getElementById('users-list').innerHTML = `
            <div class="list-loading">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading users</p>
                <button onclick="location.href='debug-users.html'" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔍 Debug Issue
                </button>
            </div>
        `;
    }
}

// Display users in sidebar
function displayUsers(users) {
    console.log('🎨 displayUsers called with:', users.length, 'users');
    console.log('Users to display:', users);
    
    const usersList = document.getElementById('users-list');
    
    if (!usersList) {
        console.error('❌ users-list element not found!');
        return;
    }
    
    if (users.length === 0) {
        console.log('📭 No users to display - showing empty state');
        usersList.innerHTML = `
            <div class="list-loading">
                <i class="fas fa-users"></i>
                <p>No other users yet</p>
            </div>
        `;
        return;
    }
    
    console.log('✅ Rendering', users.length, 'user(s) to UI');
    
    usersList.innerHTML = users.map(user => {
        const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=random&color=fff`;
        const hasEncryption = user.public_key ? '🔐' : '';
        
        console.log('👤 Rendering user:', user.name, user.username, 'ID:', user.id);
        
        return `
            <div class="user-item" data-user-id="${user.id}">
                <div style="position: relative;">
                    <img src="${avatarUrl}" alt="${user.username}" class="user-item-avatar">
                    <span class="online-indicator"></span>
                </div>
                <div class="user-item-info">
                    <h4>${user.name || user.username} ${hasEncryption}</h4>
                    <p>@${user.username}</p>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Users rendered to DOM');
    
    // Add click listeners
    document.querySelectorAll('.user-item').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.userId;
            console.log('👆 User clicked:', userId);
            selectUser(userId);
        });
    });
}

// Select a user to chat with
function selectUser(userId) {
    selectedUser = allUsers.find(u => u.id === userId);
    
    if (!selectedUser) return;
    
    // Update active state
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-user-id="${userId}"]`)?.classList.add('active');
    
    // Update chat header
    updateChatHeader();
    
    // Load messages
    loadMessages();
    
    // Enable message input
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
}

// Update chat header
function updateChatHeader() {
    if (!selectedUser) return;
    
    const chatName = document.getElementById('chat-name');
    const chatStatus = document.getElementById('chat-status');
    const chatAvatar = document.getElementById('chat-avatar');
    
    const encryptionStatus = selectedUser.public_key ? '🔐 Encrypted' : '⚠️ Not Encrypted';
    
    chatName.textContent = selectedUser.name || selectedUser.username;
    chatStatus.textContent = encryptionStatus;
    chatStatus.style.color = selectedUser.public_key ? '#4CAF50' : '#ff9800';
    
    const avatarUrl = selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || selectedUser.username)}&background=random&color=fff`;
    chatAvatar.src = avatarUrl;
}

// Load messages (placeholder - will implement with database)
function loadMessages() {
    const messagesArea = document.getElementById('messages-area');
    
    // Clear empty state
    messagesArea.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #999;">
            <p>No messages yet. Start the conversation!</p>
        </div>
    `;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message || !selectedUser) return;
    
    // Check if encryption is available
    if (!selectedUser.public_key) {
        alert('⚠️ This user does not have encryption enabled. Cannot send encrypted message.');
        return;
    }
    
    if (!privateKey) {
        alert('⚠️ Your encryption keys are not loaded. Please refresh the page.');
        return;
    }
    
    try {
        console.log('📤 Encrypting message...');
        
        // Import recipient's public key
        const recipientPublicKey = await EncryptionService.importPublicKey(selectedUser.public_key);
        
        // Encrypt message
        const encryptedPackage = await EncryptionService.encryptMessage(message, recipientPublicKey);
        
        console.log('✅ Message encrypted successfully');
        
        // Display message immediately (unencrypted for sender)
        displayMessage({
            text: message,
            sender_id: currentUser.id,
            created_at: new Date().toISOString(),
            encrypted: true
        });
        
        // Clear input
        input.value = '';
        
        // TODO: Save encrypted message to database
        console.log('💾 Encrypted message ready for storage:', {
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            encrypted_aes_key: encryptedPackage.encryptedAESKey,
            iv: encryptedPackage.iv,
            encrypted_data: encryptedPackage.encryptedData
        });
        
    } catch (error) {
        console.error('❌ Error sending encrypted message:', error);
        alert('Failed to encrypt message. Please try again.');
    }
}

// Display a message
function displayMessage(message) {
    const messagesArea = document.getElementById('messages-area');
    
    // Remove empty state if present
    if (messagesArea.querySelector('div[style*="text-align"]')) {
        messagesArea.innerHTML = '';
    }
    
    const isSent = message.sender_id === currentUser.id;
    const time = new Date(message.created_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const encryptionBadge = message.encrypted ? '<i class="fas fa-lock" style="font-size: 10px; margin-left: 5px;" title="Encrypted"></i>' : '';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${escapeHtml(message.text)}</div>
            <span class="message-time">${time} ${encryptionBadge}</span>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
    // Send message button
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    // Send message on Enter key
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Search users
    document.getElementById('search-users').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(user => 
            (user.name?.toLowerCase().includes(query)) ||
            (user.username?.toLowerCase().includes(query))
        );
        displayUsers(filtered);
    });
    
    // Logout button (sidebar)
    document.getElementById('logout-btn').addEventListener('click', showSignOutModal);
    
    // Logout button (main header)
    const logoutBtnMain = document.getElementById('logout-btn-main');
    if (logoutBtnMain) {
        logoutBtnMain.addEventListener('click', showSignOutModal);
    }
    
    // Sign out modal buttons
    document.getElementById('cancel-signout').addEventListener('click', hideSignOutModal);
    document.getElementById('confirm-signout').addEventListener('click', confirmSignOut);
    
    // Close modal on overlay click
    document.getElementById('signout-modal').addEventListener('click', (e) => {
        if (e.target.id === 'signout-modal') {
            hideSignOutModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('signout-modal');
            if (modal && modal.classList.contains('active')) {
                hideSignOutModal();
            }
        }
    });
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        alert('Settings coming soon!');
    });
    
    // Theme toggle button
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

// Load theme from localStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('flowsec-theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcon();
    }
}

// Toggle dark/light theme
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('flowsec-theme', newTheme);
    updateThemeIcon();
    
    console.log('Theme toggled to:', newTheme);
}

// Update theme icon
function updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Show encryption warning
function showEncryptionWarning() {
    const messagesArea = document.getElementById('messages-area');
    if (messagesArea && messagesArea.innerHTML.includes('No messages yet')) {
        messagesArea.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ff9800;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px;"></i>
                <h3>Encryption Keys Not Available</h3>
                <p>Your encryption keys could not be loaded.<br>
                Messages may not be secure.</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #ff9800; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// Show sign out modal
function showSignOutModal() {
    const modal = document.getElementById('signout-modal');
    if (modal) {
        modal.classList.add('active');
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

// Hide sign out modal
function hideSignOutModal() {
    const modal = document.getElementById('signout-modal');
    if (modal) {
        modal.classList.remove('active');
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Confirm sign out
async function confirmSignOut() {
    try {
        // Show loading state on button
        const confirmBtn = document.getElementById('confirm-signout');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing out...';
        confirmBtn.disabled = true;
        
        // Sign out from Supabase
        await supabaseClient.auth.signOut();
        console.log('✅ Signed out successfully');
        
        // Clear any sensitive data from memory
        privateKey = null;
        currentUser = null;
        selectedUser = null;
        
        // Hide modal
        hideSignOutModal();
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 300);
        
    } catch (error) {
        console.error('❌ Sign out error:', error);
        
        // Show error in modal
        const modalBody = document.querySelector('.modal-body p');
        if (modalBody) {
            modalBody.innerHTML = '<span style="color: #f44336;">Failed to sign out. Please try again.</span>';
        }
        
        // Reset button
        const confirmBtn = document.getElementById('confirm-signout');
        confirmBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
        confirmBtn.disabled = false;
    }
}
