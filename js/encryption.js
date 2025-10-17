// End-to-End Encryption Module for Flowsec
// Uses RSA-OAEP for key exchange and AES-GCM for message/file encryption

const EncryptionService = {
    // Generate RSA key pair (public/private)
    async generateKeyPair() {
        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256"
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );
            
            console.log('✅ RSA key pair generated');
            return keyPair;
        } catch (error) {
            console.error('❌ Error generating key pair:', error);
            throw error;
        }
    },

    // Export public key to base64 string (for database storage)
    async exportPublicKey(publicKey) {
        try {
            const exported = await window.crypto.subtle.exportKey('spki', publicKey);
            const exportedAsString = this.arrayBufferToBase64(exported);
            return exportedAsString;
        } catch (error) {
            console.error('❌ Error exporting public key:', error);
            throw error;
        }
    },

    // Import public key from base64 string
    async importPublicKey(base64Key) {
        try {
            const binaryKey = this.base64ToArrayBuffer(base64Key);
            const publicKey = await window.crypto.subtle.importKey(
                'spki',
                binaryKey,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256"
                },
                true,
                ["encrypt"]
            );
            return publicKey;
        } catch (error) {
            console.error('❌ Error importing public key:', error);
            throw error;
        }
    },

    // Export private key to encrypted format (for localStorage)
    async exportPrivateKey(privateKey, password) {
        try {
            // Export private key
            const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
            
            // Derive encryption key from password
            const encryptionKey = await this.deriveKeyFromPassword(password);
            
            // Encrypt private key with AES
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encryptedKey = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                encryptionKey,
                exported
            );
            
            // Combine IV + encrypted key
            const combined = new Uint8Array(iv.length + encryptedKey.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encryptedKey), iv.length);
            
            return this.arrayBufferToBase64(combined);
        } catch (error) {
            console.error('❌ Error exporting private key:', error);
            throw error;
        }
    },

    // Import private key from encrypted format
    async importPrivateKey(encryptedBase64, password) {
        try {
            // Decode base64
            const combined = this.base64ToArrayBuffer(encryptedBase64);
            
            // Extract IV and encrypted key
            const iv = combined.slice(0, 12);
            const encryptedKey = combined.slice(12);
            
            // Derive decryption key from password
            const decryptionKey = await this.deriveKeyFromPassword(password);
            
            // Decrypt private key
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                decryptionKey,
                encryptedKey
            );
            
            // Import decrypted key
            const privateKey = await window.crypto.subtle.importKey(
                'pkcs8',
                decrypted,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256"
                },
                true,
                ["decrypt"]
            );
            
            return privateKey;
        } catch (error) {
            console.error('❌ Error importing private key:', error);
            throw error;
        }
    },

    // Derive AES key from password using PBKDF2
    async deriveKeyFromPassword(password, salt = null) {
        try {
            // Use fixed salt for simplicity (in production, use random salt per user)
            const saltBuffer = salt || new TextEncoder().encode('flowsec-salt-v1');
            
            // Import password
            const passwordKey = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            // Derive AES key
            const aesKey = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: saltBuffer,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                passwordKey,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            
            return aesKey;
        } catch (error) {
            console.error('❌ Error deriving key from password:', error);
            throw error;
        }
    },

    // Generate AES key for message encryption (hybrid encryption)
    async generateAESKey() {
        try {
            const key = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
            return key;
        } catch (error) {
            console.error('❌ Error generating AES key:', error);
            throw error;
        }
    },

    // Encrypt message using hybrid encryption (RSA + AES)
    async encryptMessage(message, recipientPublicKey) {
        try {
            // 1. Generate random AES key for this message
            const aesKey = await this.generateAESKey();
            
            // 2. Encrypt message with AES
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encodedMessage = new TextEncoder().encode(message);
            const encryptedMessage = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                encodedMessage
            );
            
            // 3. Export AES key
            const exportedAESKey = await window.crypto.subtle.exportKey('raw', aesKey);
            
            // 4. Encrypt AES key with recipient's RSA public key
            const encryptedAESKey = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                recipientPublicKey,
                exportedAESKey
            );
            
            // 5. Combine everything: encrypted AES key + IV + encrypted message
            return {
                encryptedAESKey: this.arrayBufferToBase64(encryptedAESKey),
                iv: this.arrayBufferToBase64(iv),
                encryptedData: this.arrayBufferToBase64(encryptedMessage)
            };
        } catch (error) {
            console.error('❌ Error encrypting message:', error);
            throw error;
        }
    },

    // Decrypt message using hybrid decryption
    async decryptMessage(encryptedPackage, privateKey) {
        try {
            // 1. Decrypt AES key with private RSA key
            const encryptedAESKey = this.base64ToArrayBuffer(encryptedPackage.encryptedAESKey);
            const decryptedAESKeyBuffer = await window.crypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                encryptedAESKey
            );
            
            // 2. Import decrypted AES key
            const aesKey = await window.crypto.subtle.importKey(
                'raw',
                decryptedAESKeyBuffer,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );
            
            // 3. Decrypt message with AES key
            const iv = this.base64ToArrayBuffer(encryptedPackage.iv);
            const encryptedData = this.base64ToArrayBuffer(encryptedPackage.encryptedData);
            
            const decryptedData = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                encryptedData
            );
            
            // 4. Decode message
            const message = new TextDecoder().decode(decryptedData);
            return message;
        } catch (error) {
            console.error('❌ Error decrypting message:', error);
            throw error;
        }
    },

    // Encrypt file (for file sharing)
    async encryptFile(file, recipientPublicKey, onProgress = null) {
        try {
            // Read file as array buffer
            const fileBuffer = await file.arrayBuffer();
            
            // Generate AES key for this file
            const aesKey = await this.generateAESKey();
            
            // Encrypt file with AES
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encryptedFile = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                fileBuffer
            );
            
            if (onProgress) onProgress(50);
            
            // Export and encrypt AES key with recipient's public key
            const exportedAESKey = await window.crypto.subtle.exportKey('raw', aesKey);
            const encryptedAESKey = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                recipientPublicKey,
                exportedAESKey
            );
            
            if (onProgress) onProgress(100);
            
            // Return encrypted package
            return {
                encryptedAESKey: this.arrayBufferToBase64(encryptedAESKey),
                iv: this.arrayBufferToBase64(iv),
                encryptedData: encryptedFile, // Keep as ArrayBuffer for file upload
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
            };
        } catch (error) {
            console.error('❌ Error encrypting file:', error);
            throw error;
        }
    },

    // Decrypt file
    async decryptFile(encryptedPackage, privateKey, onProgress = null) {
        try {
            // Decrypt AES key with private RSA key
            const encryptedAESKey = this.base64ToArrayBuffer(encryptedPackage.encryptedAESKey);
            const decryptedAESKeyBuffer = await window.crypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                encryptedAESKey
            );
            
            if (onProgress) onProgress(50);
            
            // Import decrypted AES key
            const aesKey = await window.crypto.subtle.importKey(
                'raw',
                decryptedAESKeyBuffer,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );
            
            // Decrypt file with AES key
            const iv = this.base64ToArrayBuffer(encryptedPackage.iv);
            const decryptedData = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                encryptedPackage.encryptedData
            );
            
            if (onProgress) onProgress(100);
            
            return decryptedData;
        } catch (error) {
            console.error('❌ Error decrypting file:', error);
            throw error;
        }
    },

    // Helper: ArrayBuffer to Base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    // Helper: Base64 to ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // Store private key in localStorage (encrypted)
    async storePrivateKey(privateKey, userId, password) {
        try {
            const encrypted = await this.exportPrivateKey(privateKey, password);
            localStorage.setItem(`flowsec-privatekey-${userId}`, encrypted);
            console.log('✅ Private key stored securely');
        } catch (error) {
            console.error('❌ Error storing private key:', error);
            throw error;
        }
    },

    // Retrieve private key from localStorage
    async retrievePrivateKey(userId, password) {
        try {
            const encrypted = localStorage.getItem(`flowsec-privatekey-${userId}`);
            if (!encrypted) {
                throw new Error('Private key not found');
            }
            const privateKey = await this.importPrivateKey(encrypted, password);
            console.log('✅ Private key retrieved');
            return privateKey;
        } catch (error) {
            console.error('❌ Error retrieving private key:', error);
            throw error;
        }
    },

    // Verify if user has keys set up
    hasPrivateKey(userId) {
        return localStorage.getItem(`flowsec-privatekey-${userId}`) !== null;
    },

    // Generate fingerprint for key verification
    async generateKeyFingerprint(publicKey) {
        try {
            const exported = await window.crypto.subtle.exportKey('spki', publicKey);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const fingerprint = hashArray
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase()
                .match(/.{1,4}/g)
                .join(' ');
            return fingerprint;
        } catch (error) {
            console.error('❌ Error generating fingerprint:', error);
            throw error;
        }
    }
};

// Export for use in other modules
window.EncryptionService = EncryptionService;
console.log('🔐 Encryption Service initialized');
