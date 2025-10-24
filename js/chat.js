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
    
    // Setup automatic token refresh
    setupTokenRefresh();
    
    // Check authentication
    await checkAuth();
    
    // Load current user profile
    await loadCurrentUser();
    
    // Load user's private key
    await loadPrivateKey();
    
    // Check if private key loaded successfully
    if (!privateKey && currentUser && currentUser.public_key) {
        console.error('❌ Private key not available after loading');
        console.log('🔑 Showing key regeneration prompt...');
        // Delay to ensure DOM is ready
        setTimeout(() => {
            showEncryptionWarning();
        }, 500);
    }
    
    // Load all users
    await loadUsers();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Chat dashboard initialized');
    console.log('Private key status:', privateKey ? '✅ Loaded' : '❌ Not loaded');
});

// Setup automatic token refresh
function setupTokenRefresh() {
    // Refresh session every 30 minutes
    setInterval(async () => {
        console.log('🔄 Refreshing session token...');
        const { data, error } = await supabaseClient.auth.refreshSession();
        if (error) {
            console.error('❌ Token refresh failed:', error);
            // Redirect to login if refresh fails
            window.location.href = 'login.html';
        } else {
            console.log('✅ Session refreshed successfully');
        }
    }, 30 * 60 * 1000); // 30 minutes
}

// Check if user is authenticated
async function checkAuth() {
    try {
        // Try to get current session
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            
            // If JWT expired, try to refresh
            if (error.message?.includes('JWT') || error.message?.includes('expired')) {
                console.log('🔄 Token expired, attempting refresh...');
                const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession();
                
                if (refreshError || !refreshData.session) {
                    console.log('❌ Refresh failed, redirecting to login...');
                    window.location.href = 'login.html';
                    return;
                }
                
                console.log('✅ Session refreshed successfully');
                return;
            }
            
            // Other errors, redirect to login
            window.location.href = 'login.html';
            return;
        }
        
        if (!session) {
            console.log('Not authenticated, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('User authenticated:', session.user.email);
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = 'login.html';
    }
}

// Load current user profile
async function loadCurrentUser() {
    try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        
        if (authError) throw authError;
        
        // Get profile from database
        // For the current user we need full profile (including encrypted_private_key/password_hash)
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
        if (!currentUser) {
            console.warn('⚠️ No current user, cannot load private key');
            return;
        }
        
        console.log('🔍 Looking for private key for user:', currentUser.id);
        
        // Get password from sessionStorage (set during login) or fallback to email
        const { data: { user } } = await supabaseClient.auth.getUser();
        const password = sessionStorage.getItem('tempPassword') || user.email;
        
        // Check if private key exists in localStorage for THIS user
        if (!EncryptionService.hasPrivateKey(currentUser.id)) {
            console.warn('⚠️ No private key found in localStorage. Checking server...');
            
            // If user has public key in database, try to download encrypted private key from server
                if (currentUser.public_key && currentUser.encrypted_private_key) {
                    console.log('🔐 Found encrypted private key on server, attempting to decrypt...');

                    // If a password hash exists in profile, verify password before attempting decrypt
                    if (currentUser.password_hash) {
                        console.log('🔎 Verifying provided password against stored password hash...');
                        const verified = await EncryptionService.verifyPassword(password, currentUser.password_hash);
                        if (!verified) {
                            console.error('❌ Password verification failed. Will not attempt decryption.');
                            showEncryptionWarning();
                            return;
                        }
                        console.log('✅ Password verification succeeded');
                    } else {
                        console.log('ℹ️ No password hash stored on profile; attempting decryption directly');
                    }

                    try {
                        // Decrypt private key from server backup
                        privateKey = await EncryptionService.decryptPrivateKeyFromBackup(
                            currentUser.encrypted_private_key, 
                            password
                        );

                        if (privateKey) {
                            console.log('✅ Private key decrypted from server backup successfully');

                            // Store in localStorage for faster access next time
                            await EncryptionService.storePrivateKey(privateKey, currentUser.id, password);
                            console.log('✅ Private key cached in localStorage');

                            return; // Success!
                        }
                    } catch (decryptError) {
                        console.error('❌ Failed to decrypt private key from server:', decryptError);
                        console.error('💡 This usually means wrong password or corrupted key');
                        showEncryptionWarning();
                        return;
                    }
                } else if (currentUser.public_key) {
                // User has public key but no encrypted private key backup
                console.warn('🔐 User has public key in DB but no private key backup on server');
                console.warn('💡 This user either:');
                console.warn('   - Logged in on different device (before backup was implemented)');
                console.warn('   - Cleared browser data');
                console.warn('   - Is using incognito mode');
                showEncryptionWarning();
            } else {
                console.warn('⚠️ User has no encryption keys at all. Keys not generated during signup.');
            }
            return;
        }
        
        console.log('🔓 Attempting to decrypt private key from localStorage...');
        
        // Retrieve and decrypt private key from localStorage
        privateKey = await EncryptionService.retrievePrivateKey(currentUser.id, password);
        
        if (privateKey) {
            console.log('✅ Private key loaded and decrypted successfully from localStorage');
        } else {
            console.error('❌ Private key retrieved but is null/undefined');
            showEncryptionWarning();
        }
        
    } catch (error) {
        console.error('❌ Error loading private key:', error);
        console.error('Error details:', error.message);
        
        // If decryption fails, the stored key might be corrupted or for wrong user
        // Clear the invalid key
        if (currentUser && currentUser.id) {
            const keyName = `flowsec-privatekey-${currentUser.id}`;
            console.warn('🗑️ Removing potentially corrupted key:', keyName);
            localStorage.removeItem(keyName);
        }
        
        // Show warning to user
        showEncryptionWarning();
    }
}

// Update debug panel in UI
function updateDebugPanel(info) {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.innerHTML = info;
    }
}

// Load all users
async function loadUsers() {
    try {
        console.log('🔍 Loading users from database...');
        console.log('Current user:', currentUser);
        console.log('Current user ID:', currentUser?.id);
        
        updateDebugPanel('⏳ Loading users...');
        
        // Check if we have a valid session first
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        console.log('📋 Current session:', session);
        
        if (sessionError || !session) {
            console.error('❌ No valid session!', sessionError);
            updateDebugPanel('❌ No valid session - redirecting...');
            window.location.href = 'login.html';
            return;
        }
        
        // First, get ALL users to see what's in database
        console.log('📡 Fetching ALL users from database (public view)...');
        // Query the safe public view (public_profiles) so RLS doesn't leak sensitive fields
        const { data: allDbUsers, error: allError } = await supabaseClient
            .from('public_profiles')
            .select('id, name, username, avatar_url, public_key, key_fingerprint, created_at')
            .order('created_at', { ascending: false });
        
        if (allError) {
            console.error('❌ Error fetching all users:', allError);
            updateDebugPanel(`❌ Database error: ${allError.message}`);
            throw allError;
        }
        
        console.log('📊 ALL users in database:', allDbUsers);
        console.log('📊 Total users count:', allDbUsers?.length || 0);
        
        if (allDbUsers) {
            allDbUsers.forEach((user, index) => {
                console.log(`User ${index + 1}:`, {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    isCurrentUser: user.id === currentUser?.id
                });
            });
        }
        
        // Now get users excluding current user (keep for search)
        console.log('📡 Fetching OTHER users (excluding current user)...');
        // For other users shown in the UI, fetch only non-sensitive profile columns
        const { data: users, error } = await supabaseClient
            .from('public_profiles')
            .select('id, name, username, avatar_url, public_key, key_fingerprint')
            .neq('id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error fetching other users:', error);
            updateDebugPanel(`❌ Error: ${error.message}`);
            throw error;
        }
        
        console.log('📊 Other users (excluding me):', users);
        console.log('📊 Other users count:', users?.length || 0);
        
        allUsers = users || [];
        
        console.log('✅ Loaded users into allUsers array:', allUsers.length);
        console.log('🔐 Users with encryption:', allUsers.filter(u => u.public_key).length);
        console.log('👥 Detailed user info:');
        allUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.name} (@${user.username}) - ID: ${user.id} - Keys: ${user.public_key ? '✅' : '❌'}`);
        });
        
        // Get users with existing conversations
        console.log('💬 Fetching users with message history...');
        const { data: messages, error: msgError } = await supabaseClient
            .from('messages')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
        
        let usersWithConversations = [];
        if (!msgError && messages && messages.length > 0) {
            // Get unique user IDs from conversations
            const conversationUserIds = new Set();
            messages.forEach(msg => {
                if (msg.sender_id !== currentUser.id) conversationUserIds.add(msg.sender_id);
                if (msg.receiver_id !== currentUser.id) conversationUserIds.add(msg.receiver_id);
            });
            
            // Filter users to only those with conversations
            usersWithConversations = allUsers.filter(user => conversationUserIds.has(user.id));
            console.log('✅ Found', usersWithConversations.length, 'users with conversations');
        } else {
            console.log('📭 No existing conversations found');
        }
        
        // Update debug panel with results
        const totalUsers = allDbUsers?.length || 0;
        const otherUsers = users?.length || 0;
        const conversationUsers = usersWithConversations.length;
        const keyStatus = privateKey ? '✅ Keys loaded' : '❌ Keys missing';
        const keyAction = !privateKey && currentUser?.public_key ? 
            '<button onclick="regenerateKeys()" style="margin-left: 8px; padding: 4px 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">🔑 Generate Keys</button>' : '';
        
        const debugHtml = `
            <div><strong>Total users:</strong> ${totalUsers} | <strong>Other users:</strong> ${otherUsers}</div>
            <div><strong>Conversations:</strong> ${conversationUsers} | <strong>Encryption:</strong> ${keyStatus} ${keyAction}</div>
            <div style="font-size: 10px; color: #666; margin-top: 5px;">
                💡 Use search to find users for new conversations
            </div>
        `;
        updateDebugPanel(debugHtml);
        
        // Display only users with conversations by default
        // Search will show all users
        console.log('🎨 Displaying users with conversations:', conversationUsers);
        displayUsers(usersWithConversations);
        
        if (allUsers.length === 0) {
            console.warn('⚠️ No other users found!');
            console.log('💡 Total users in DB:', allDbUsers?.length || 0);
            console.log('💡 Current user ID:', currentUser?.id);
            console.log('💡 You need at least 2 users total (1 other user)');
        } else {
            console.log('✅ SUCCESS! Found', allUsers.length, 'other user(s) to display');
        }
        
    } catch (error) {
        console.error('❌ FATAL ERROR loading users:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        
        document.getElementById('users-list').innerHTML = `
            <div class="list-loading">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading users</p>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Retry
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
                <i class="fas fa-search" style="font-size: 48px; color: #ddd; margin-bottom: 15px;"></i>
                <p style="font-size: 16px; font-weight: 600; color: #666; margin: 0 0 8px 0;">No Conversations Yet</p>
                <p style="font-size: 13px; color: #999; margin: 0;">Use the search above to find users and start chatting!</p>
            </div>
        `;
        return;
    }
    
    console.log('✅ Rendering', users.length, 'user(s) to UI');
    
    usersList.innerHTML = users.map(user => {
        const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=random&color=fff`;
        const encryptionBadge = user.public_key 
            ? '<span style="color: #4CAF50; font-size: 14px;" title="End-to-end encryption enabled">🔐</span>' 
            : '<span style="color: #ff9800; font-size: 14px;" title="No encryption key - user needs to complete setup">⚠️</span>';
        
        console.log('👤 Rendering user:', user.name, user.username, 'ID:', user.id, 'Has key:', !!user.public_key);
        
        return `
            <div class="user-item" data-user-id="${user.id}">
                <div style="position: relative;">
                    <img src="${avatarUrl}" alt="${user.username}" class="user-item-avatar">
                    <span class="online-indicator"></span>
                </div>
                <div class="user-item-info">
                    <h4>${user.name || user.username} ${encryptionBadge}</h4>
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

// Load messages from database
async function loadMessages() {
    const messagesArea = document.getElementById('messages-area');
    
    if (!selectedUser) {
        messagesArea.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #999;">
                <p>Select a user to start chatting</p>
            </div>
        `;
        return;
    }
    
    try {
        console.log('📥 Loading messages with', selectedUser.username);
        
        // Show loading state
        messagesArea.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #999;">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading messages...</p>
            </div>
        `;
        
        // Fetch messages between current user and selected user
        // We store E2EE messages as: encrypted_content, encrypted_aes_key, iv
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('id, sender_id, receiver_id, encrypted_content, encrypted_aes_key, iv, app_ciphertext, app_iv, created_at')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('❌ Error loading messages:', error);
            throw error;
        }
        
        console.log(`📊 Found ${messages?.length || 0} messages`);
        
        if (!messages || messages.length === 0) {
            messagesArea.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #999;">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }
        
        // Clear messages area
        messagesArea.innerHTML = '';
        
        // Decrypt and display each message
        for (const msg of messages) {
            try {
                let decryptedText;
                
                // Decrypt E2EE message locally using the user's private key
                if (msg.encrypted_content && msg.encrypted_aes_key && msg.iv) {
                    if (!privateKey) {
                        console.warn('🔒 Private key not loaded; cannot decrypt message');
                        decryptedText = '[Encrypted message — keys not loaded]';
                    } else {
                        try {
                            const packageObj = {
                                encryptedAESKey: msg.encrypted_aes_key,
                                iv: msg.iv,
                                encryptedData: msg.encrypted_content
                            };
                            decryptedText = await EncryptionService.decryptMessage(packageObj, privateKey);
                        } catch (e) {
                            console.error('❌ Failed to decrypt message locally:', e);
                            decryptedText = '[Failed to decrypt message]';
                        }
                    }
                } else if (msg.app_ciphertext && msg.app_iv) {
                    // Fallback to app-level ciphertext (legacy)
                    console.log('🔓 Decrypting legacy app-level ciphertext using Supabase function...');

                    const { data: decData, error: decError } = await supabaseClient.functions.invoke('decrypt', {
                        body: JSON.stringify({ ciphertext: msg.app_ciphertext, iv: msg.app_iv })
                    });

                    if (decError || !decData) {
                        console.error('❌ Decrypt function error:', decError, decData);
                        decryptedText = '[Failed to decrypt message]';
                    } else {
                        decryptedText = decData.plaintext;
                    }
                } else {
                    decryptedText = '[No content]';
                }
                
                // Display the message
                displayMessage({
                    text: decryptedText,
                    sender_id: msg.sender_id,
                    created_at: msg.created_at,
                    encrypted: true
                });
                
            } catch (decryptError) {
                console.error('❌ Error decrypting message:', decryptError);
                
                // Display error message
                displayMessage({
                    text: '[Failed to decrypt message]',
                    sender_id: msg.sender_id,
                    created_at: msg.created_at,
                    encrypted: true
                });
            }
        }
        
        console.log('✅ All messages loaded and decrypted');
        
    } catch (error) {
        console.error('❌ Error in loadMessages:', error);
        messagesArea.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #f44336;">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading messages</p>
                <p style="font-size: 12px;">${error.message}</p>
                <button onclick="loadMessages()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Retry
                </button>
            </div>
        `;
    }
}

// Send message
async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message || !selectedUser) return;
    try {
        // E2EE flow: encrypt message with recipient's public key (hybrid RSA-OAEP + AES-GCM)
        console.log('📤 Sending E2EE message');

        if (!selectedUser.public_key) {
            console.error('❌ Recipient does not have a public key');
            showError(
                `Cannot send encrypted message to ${selectedUser.name || selectedUser.username}.\n` +
                `They need to complete their profile setup first.\n` +
                `Ask them to log in and complete their encryption key setup.`
            );
            
            // Reload user data in case they just set up their key
            console.log('🔄 Attempting to reload recipient data...');
            const { data: updatedUser, error: refreshError } = await supabaseClient
                .from('profiles')
                .select('id, name, username, avatar_url, public_key, key_fingerprint')
                .eq('id', selectedUser.id)
                .single();
            
            if (!refreshError && updatedUser && updatedUser.public_key) {
                console.log('✅ Recipient now has a public key! Updating selectedUser...');
                selectedUser = updatedUser;
                updateChatHeader(); // Update UI to show encryption status
                
                // Retry sending
                console.log('🔄 Retrying message send...');
                await sendMessage();
            }
            return;
        }

        // Import recipient public key and encrypt
        const recipientPub = await EncryptionService.importPublicKey(selectedUser.public_key);
        const encryptedPackage = await EncryptionService.encryptMessage(message, recipientPub);

        const messagePayload = {
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            encrypted_content: encryptedPackage.encryptedData,
            encrypted_aes_key: encryptedPackage.encryptedAESKey,
            iv: encryptedPackage.iv,
            created_at: new Date().toISOString()
        };

        const { data: messageData, error: saveError } = await supabaseClient
            .from('messages')
            .insert(messagePayload)
            .select()
            .single();

        if (saveError) {
            console.error('❌ Database save error:', saveError);
            showError(`❌ Failed to save message: ${saveError.message}`);
            throw saveError;
        }

        console.log('✅ Message saved to database:', messageData);

        // Display message immediately
        displayMessage({
            text: message,
            sender_id: currentUser.id,
            created_at: messageData.created_at,
            encrypted: false
        });

        input.value = '';

    } catch (error) {
        console.error('❌ Error sending message:', error);
        alert('Failed to send message: ' + error.message);
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

// Show error message in chat area
function showError(message) {
    const messagesArea = document.getElementById('messages-area');
    if (messagesArea) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'text-align: center; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; margin: 10px; color: #856404;';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
            ${message}
        `;
        messagesArea.appendChild(errorDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
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
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', showSettingsModal);
    
    // Close settings modal
    document.getElementById('close-settings').addEventListener('click', hideSettingsModal);
    
    // Close settings modal on overlay click
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            hideSettingsModal();
        }
    });
    
    // Theme toggle button in header
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Theme select in settings
    document.getElementById('theme-select').addEventListener('change', (e) => {
        changeTheme(e.target.value);
    });
    
    // Regenerate keys from settings
    const regenerateKeysSettings = document.getElementById('regenerate-keys-settings');
    if (regenerateKeysSettings) {
        regenerateKeysSettings.addEventListener('click', regenerateKeys);
    }
    
    // File upload button
    document.getElementById('attach-file-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    
    // File input change
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    
    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const signoutModal = document.getElementById('signout-modal');
            const settingsModal = document.getElementById('settings-modal');
            
            if (signoutModal && signoutModal.classList.contains('active')) {
                hideSignOutModal();
            }
            if (settingsModal && settingsModal.classList.contains('active')) {
                hideSettingsModal();
            }
        }
    });
}

// Load theme from localStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('flowsec-theme') || 'light';
    
    if (savedTheme === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.body.setAttribute('data-theme', savedTheme);
    }
    
    updateThemeIcon();
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

// Change theme based on selection
function changeTheme(theme) {
    if (theme === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.body.setAttribute('data-theme', theme);
    }
    
    localStorage.setItem('flowsec-theme', theme);
    updateThemeIcon();
    console.log('Theme changed to:', theme);
}

// Show settings modal
function showSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active');
        
        // Load current theme selection
        const savedTheme = localStorage.getItem('flowsec-theme') || 'light';
        document.getElementById('theme-select').value = savedTheme;
        
        // Update encryption status
        const encryptionStatus = document.getElementById('encryption-status');
        if (encryptionStatus) {
            if (privateKey) {
                encryptionStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #4CAF50;"></i> End-to-end encryption enabled';
            } else {
                encryptionStatus.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i> Keys not loaded';
            }
        }
        
        // Update key fingerprint
        const fingerprintEl = document.getElementById('key-fingerprint');
        if (fingerprintEl && currentUser && currentUser.key_fingerprint) {
            fingerprintEl.textContent = currentUser.key_fingerprint;
        } else if (fingerprintEl) {
            fingerprintEl.textContent = 'Not available';
        }
    }
}

// Hide settings modal
function hideSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!selectedUser) {
        alert('Please select a user to send the file to');
        event.target.value = ''; // Reset file input
        return;
    }
    
    if (!privateKey) {
        alert('Encryption keys not loaded. Cannot send files.');
        event.target.value = '';
        return;
    }
    
    // File size limit: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        event.target.value = '';
        return;
    }
    
    console.log('📎 File selected:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');
    
    try {
        // Show uploading message
        const messagesArea = document.getElementById('messages-area');
        const uploadingMsg = document.createElement('div');
        uploadingMsg.className = 'file-upload-progress';
        uploadingMsg.innerHTML = `
            <div class="file-icon">
                <i class="fas fa-file"></i>
            </div>
            <div class="file-upload-info">
                <div class="file-name">${file.name}</div>
                <div class="file-progress">Encrypting and uploading...</div>
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
            </div>
        `;
        messagesArea.appendChild(uploadingMsg);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        
        // TODO: Implement file encryption and upload
        // For now, show a message that file upload is coming soon
        setTimeout(() => {
            uploadingMsg.remove();
            alert('File upload feature coming soon! Files will be encrypted before upload.');
        }, 1500);
        
        // Reset file input
        event.target.value = '';
        
    } catch (error) {
        console.error('❌ File upload error:', error);
        alert('Failed to upload file. Please try again.');
        event.target.value = '';
    }
}

// Show encryption warning
function showEncryptionWarning() {
    // Create modal HTML if it doesn't exist
    if (!document.getElementById('encryption-warning-modal')) {
        const modalHTML = `
            <div id="encryption-warning-modal" class="modal">
                <div class="modal-overlay" onclick="hideEncryptionWarning()"></div>
                <div class="modal-content" style="max-width: 400px;">
                    <div style="text-align: center; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #ff9800, #ff5722); width: 80px; height: 80px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: white;"></i>
                        </div>
                        <h3 style="margin: 0 0 10px 0; color: #333;">Encryption Keys Not Loaded</h3>
                        <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
                            Your private encryption key could not be loaded from this device. This might happen if:
                        </p>
                        <ul style="text-align: left; color: #666; line-height: 1.8; margin: 0 0 20px 40px;">
                            <li>You're on a different device</li>
                            <li>Browser data was cleared</li>
                            <li>This is a new browser/incognito mode</li>
                        </ul>
                        <p style="color: #ff9800; font-weight: 600; margin-bottom: 20px;">
                            ⚠️ You won't be able to read encrypted messages
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button onclick="regenerateKeys()" style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                🔑 Generate New Keys
                            </button>
                            <div style="display: flex; gap: 10px;">
                                <button onclick="location.reload()" style="flex: 1; padding: 10px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                                    🔄 Reload
                                </button>
                                <button onclick="hideEncryptionWarning()" style="flex: 1; padding: 10px 16px; background: #f0f0f0; color: #333; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Show modal
    const modal = document.getElementById('encryption-warning-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideEncryptionWarning() {
    const modal = document.getElementById('encryption-warning-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function regenerateKeys() {
    if (!confirm('⚠️ Warning: Generating new keys will prevent you from reading old encrypted messages.\n\nOld messages will become unreadable, but you can send and receive new messages.\n\nContinue?')) {
        return;
    }
    
    try {
        console.log('🔑 Regenerating encryption keys...');
        hideEncryptionWarning();
        
        // Show loading indicator
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #667eea; margin-bottom: 20px;"></i>
                    <h3>Generating New Encryption Keys...</h3>
                    <p style="color: #666;">This will take a moment...</p>
                </div>
            `;
        }
        
        // Get user email as password
        const { data: { user } } = await supabaseClient.auth.getUser();
        const password = user.email;
        
        // Generate new key pair
        console.log('🔐 Generating RSA key pair...');
        const keyPair = await EncryptionService.generateKeyPair();
        
        // Store private key encrypted in localStorage
        console.log('💾 Storing encrypted private key...');
        await EncryptionService.storePrivateKey(currentUser.id, keyPair.privateKey, password);
        
        // Export public key to store in database
        console.log('📤 Exporting public key...');
        const publicKeyString = await EncryptionService.exportPublicKey(keyPair.publicKey);
        
        // Generate key fingerprint for verification
        const encoder = new TextEncoder();
        const publicKeyData = encoder.encode(publicKeyString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', publicKeyData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const keyFingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
        
        // Update database with new public key
        console.log('☁️ Updating public key in database...');
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                public_key: publicKeyString,
                key_fingerprint: keyFingerprint,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);
        
        if (updateError) {
            throw updateError;
        }
        
        // Update currentUser object
        currentUser.public_key = publicKeyString;
        currentUser.key_fingerprint = keyFingerprint;
        
        // Load the new private key
        privateKey = keyPair.privateKey;
        
        console.log('✅ Encryption keys regenerated successfully!');
        console.log('🔑 Key fingerprint:', keyFingerprint);
        
        // Show success message and auto-reload
        if (messagesArea) {
            messagesArea.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;"></i>
                    <h3 style="color: #4CAF50;">Keys Generated Successfully!</h3>
                    <p style="color: #666; margin: 10px 0 20px 0;">Reloading page...</p>
                </div>
            `;
        }
        
        // Auto-reload after 1.5 seconds
        setTimeout(() => {
            location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error regenerating keys:', error);
        
        // Show error in chat area instead of alert
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #f44336; margin-bottom: 20px;"></i>
                    <h3 style="color: #f44336;">Error Generating Keys</h3>
                    <p style="color: #666; margin: 10px 0 20px 0;">${error.message}</p>
                    <button onclick="location.reload()" style="padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        🔄 Reload Page
                    </button>
                </div>
            `;
        }
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
        
        // Clear encryption keys from localStorage
        // Remove all stored private keys (they're stored with userId prefix)
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('privateKey_') || key.startsWith('encrypted_privateKey_') || key.startsWith('flowsec-privatekey-'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            console.log('🗑️ Removing key:', key);
            localStorage.removeItem(key);
        });
        
        // Clear password from sessionStorage
        sessionStorage.removeItem('tempPassword');
        sessionStorage.removeItem('pendingPassword');
        sessionStorage.removeItem('tempEmail');
        console.log('🗑️ Cleared password from sessionStorage');
        
        console.log('✅ Cleared encryption keys from device');
        
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

// Debug function to check users
async function debugUsers() {
    console.log('🐛 DEBUG: Starting user debug...');
    
    try {
        // Check session
        const { data: { session } } = await supabaseClient.auth.getSession();
        console.log('🔐 Current session:', session);
        console.log('👤 Current user from session:', session?.user);
        console.log('👤 Current user from memory:', currentUser);
        
        // Check all users in database
        const { data: allUsers, error } = await supabaseClient
            .from('profiles')
            .select('*');
        
        console.log('📊 Database query result:', { allUsers, error });
        
        if (error) {
            console.error('❌ Database error:', error);
            alert('Database error: ' + error.message);
            return;
        }
        
        console.log('📊 Total users in database:', allUsers?.length);
        
        if (allUsers && allUsers.length > 0) {
            console.log('👥 All users:');
            allUsers.forEach((user, i) => {
                console.log(`  ${i + 1}. ${user.name} (@${user.username})`);
                console.log(`     ID: ${user.id}`);
                console.log(`     Email: ${user.email}`);
                console.log(`     Is me: ${user.id === currentUser?.id ? 'YES' : 'NO'}`);
                console.log(`     Has keys: ${user.public_key ? 'YES' : 'NO'}`);
            });
        }
        
        // Check allUsers variable
        console.log('📦 allUsers variable:', allUsers);
        console.log('📦 allUsers length:', allUsers?.length);
        
        // Show alert
        const summary = `
Debug Info:
- Session: ${session ? 'Valid' : 'Invalid'}
- Current User: ${currentUser?.name || 'Unknown'}
- Total DB Users: ${allUsers?.length || 0}
- Loaded Users: ${allUsers?.length || 0}

Check console (F12) for detailed logs!
        `.trim();
        
        alert(summary);
        
    } catch (error) {
        console.error('🐛 Debug error:', error);
        alert('Debug error: ' + error.message);
    }
}

// Make debugUsers available globally
window.debugUsers = debugUsers;
