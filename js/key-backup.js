// Key Backup Service
// Handles exporting and importing encryption keys for multi-device support

const KeyBackupService = {
    /**
     * Export user's private key to a downloadable encrypted file
     * @param {string} userId - Current user ID
     * @param {string} password - Password to encrypt the backup (user's email)
     * @returns {Promise<void>}
     */
    async exportKey(userId, password) {
        try {
            console.log('📦 Exporting encryption key...');
            
            // Get encrypted private key from localStorage
            const encryptedKey = localStorage.getItem(`encrypted_privateKey_${userId}`);
            
            if (!encryptedKey) {
                throw new Error('No private key found to export');
            }
            
            // Create backup object
            const backup = {
                version: '1.0',
                userId: userId,
                encryptedPrivateKey: encryptedKey,
                exportedAt: new Date().toISOString(),
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            };
            
            // Convert to JSON
            const backupJson = JSON.stringify(backup, null, 2);
            
            // Create blob and download
            const blob = new Blob([backupJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flowsec-keys-${userId.substring(0, 8)}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ Key backup downloaded successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error exporting key:', error);
            throw error;
        }
    },
    
    /**
     * Import private key from backup file
     * @param {File} file - Backup file uploaded by user
     * @param {string} currentUserId - Current logged-in user ID
     * @returns {Promise<boolean>}
     */
    async importKey(file, currentUserId) {
        try {
            console.log('📥 Importing encryption key...');
            
            // Read file
            const text = await file.text();
            const backup = JSON.parse(text);
            
            // Validate backup format
            if (!backup.version || !backup.userId || !backup.encryptedPrivateKey) {
                throw new Error('Invalid backup file format');
            }
            
            // Check if backup is for current user
            if (backup.userId !== currentUserId) {
                throw new Error(`This backup is for a different user. Backup user: ${backup.userId.substring(0, 8)}..., Current user: ${currentUserId.substring(0, 8)}...`);
            }
            
            // Store encrypted key in localStorage
            localStorage.setItem(`encrypted_privateKey_${currentUserId}`, backup.encryptedPrivateKey);
            
            console.log('✅ Key imported successfully');
            console.log('📅 Backup was created:', backup.exportedAt);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error importing key:', error);
            throw error;
        }
    },
    
    /**
     * Check if user has a backup available
     * @param {string} userId - User ID to check
     * @returns {boolean}
     */
    hasBackup(userId) {
        return localStorage.getItem(`encrypted_privateKey_${userId}`) !== null;
    },
    
    /**
     * Get backup info
     * @param {string} userId - User ID
     * @returns {Object|null}
     */
    getBackupInfo(userId) {
        const encryptedKey = localStorage.getItem(`encrypted_privateKey_${userId}`);
        if (!encryptedKey) return null;
        
        return {
            exists: true,
            keyLength: encryptedKey.length,
            storedAt: localStorage.getItem(`key_stored_at_${userId}`) || 'unknown'
        };
    }
};

// Make globally available
window.KeyBackupService = KeyBackupService;
