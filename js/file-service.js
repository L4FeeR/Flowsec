// File Sharing Service with E2EE and VirusTotal Integration
class FileService {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB limit
    }

    /**
     * Encrypt and upload a file to storage, then scan with VirusTotal
     * @param {File} file - The file to upload
     * @param {string} senderId - Sender user ID
     * @param {string} receiverId - Receiver user ID
     * @param {CryptoKey} recipientPublicKey - Recipient's RSA public key
     * @param {CryptoKey} senderPublicKey - Sender's RSA public key (optional, for dual encryption)
     * @returns {Promise<Object>} File metadata and scan info
     */
    async sendFile(file, senderId, receiverId, recipientPublicKey, senderPublicKey = null) {
        try {
            console.log('📤 Starting file send process:', file.name);

            // Validate file size
            if (file.size > this.maxFileSize) {
                throw new Error(`File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`);
            }

            // 1. Encrypt the file with AES-GCM
            console.log('🔐 Encrypting file...');
            const encryptedFile = await EncryptionService.encryptFile(file);

            // 2. Encrypt the AES key with recipient's public key
            const encryptedKeyBuffer = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                recipientPublicKey,
                encryptedFile.key
            );
            const encryptedKey = btoa(String.fromCharCode(...new Uint8Array(encryptedKeyBuffer)));
            
            // 3. Also encrypt the AES key with sender's public key (for dual encryption)
            let encryptedKeySender = null;
            if (senderPublicKey) {
                try {
                    const encryptedKeySenderBuffer = await crypto.subtle.encrypt(
                        { name: 'RSA-OAEP' },
                        senderPublicKey,
                        encryptedFile.key
                    );
                    encryptedKeySender = btoa(String.fromCharCode(...new Uint8Array(encryptedKeySenderBuffer)));
                    console.log('✅ File encrypted for both sender and recipient');
                } catch (senderEncryptError) {
                    console.warn('⚠️ Failed to encrypt for sender, sender wont be able to download their own file:', senderEncryptError);
                }
            } else {
                console.warn('⚠️ No sender public key provided - sender cannot decrypt their own files');
            }
            
            // Convert IV to base64
            const ivBase64 = btoa(String.fromCharCode(...encryptedFile.iv));

            // 3. Upload encrypted file to Supabase storage
            console.log('☁️ Uploading encrypted file to storage...');
            const fileName = `${senderId}/${Date.now()}-${file.name}.encrypted`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('encrypted-files')
                .upload(fileName, encryptedFile.encryptedBlob, {
                    contentType: 'application/octet-stream'
                });

            if (uploadError) {
                console.error('❌ File upload failed:', uploadError);
                throw uploadError;
            }

            console.log('✅ File uploaded:', fileName);

            // 4. Initiate VirusTotal scan on ORIGINAL file (before encryption)
            console.log('🦠 Initiating VirusTotal scan...');
            let vtScanId = null;
            let vtStatus = 'pending';
            let vtErrorMessage = null;
            
            if (!virusTotalService) {
                console.warn('⚠️ VirusTotal service not available - skipping scan');
                vtStatus = 'skipped';
                vtErrorMessage = 'VirusTotal service not initialized';
            } else {
                try {
                    const scanResult = await virusTotalService.scanFile(file);
                    vtScanId = scanResult.scanId;
                    vtStatus = 'scanning';
                    console.log('✅ VirusTotal scan initiated:', vtScanId);
                } catch (vtError) {
                    console.error('⚠️ VirusTotal scan failed:', vtError);
                    vtStatus = 'skipped';
                    vtErrorMessage = vtError.message;
                    
                    // Log CORS issue specifically
                    if (vtError.message.includes('CORS')) {
                        console.warn('💡 VirusTotal scanning requires a backend proxy. Files will be uploaded without virus scanning.');
                        console.warn('💡 Consider implementing a backend API endpoint to proxy VirusTotal requests.');
                    }
                }
            }

            // 5. Save file metadata to database
            console.log('💾 Saving file metadata to database...');
            const fileMetadata = {
                sender_id: senderId,
                receiver_id: receiverId,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type || 'application/octet-stream',
                storage_path: fileName,
                encrypted_key: encryptedKey,
                encrypted_key_sender: encryptedKeySender,
                iv: ivBase64,
                vt_scan_id: vtScanId,
                vt_status: vtStatus,
                created_at: new Date().toISOString()
            };

            const { data: fileRecord, error: dbError } = await supabaseClient
                .from('files')
                .insert(fileMetadata)
                .select()
                .single();

            if (dbError) {
                console.error('❌ Database save failed:', dbError);
                // Clean up uploaded file
                await supabaseClient.storage.from('encrypted-files').remove([fileName]);
                throw dbError;
            }

            console.log('✅ File metadata saved:', fileRecord);

            // 6. Poll VirusTotal for results (async, don't block)
            if (vtScanId) {
                this.pollVirusTotalResults(fileRecord.id, vtScanId);
            }

            return fileRecord;
        } catch (error) {
            console.error('❌ File send failed:', error);
            throw error;
        }
    }

    /**
     * Poll VirusTotal for scan results and update database
     * @param {string} fileId - Database file record ID
     * @param {string} scanId - VirusTotal scan ID
     */
    async pollVirusTotalResults(fileId, scanId) {
        const maxAttempts = 20;
        const pollInterval = 10000; // 10 seconds

        if (!virusTotalService) {
            console.warn('⚠️ VirusTotal service not available - cannot poll results');
            return;
        }

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            try {
                console.log(`🔍 Polling VirusTotal (attempt ${attempt + 1}/${maxAttempts})...`);
                
                const analysis = await virusTotalService.getAnalysis(scanId);
                
                if (analysis.status === 'completed') {
                    console.log('✅ VirusTotal scan completed:', analysis);
                    
                    const threatInfo = virusTotalService.parseThreatInfo(analysis);
                    
                    // Update database with results
                    const { error: updateError } = await supabaseClient
                        .from('files')
                        .update({
                            vt_status: 'completed',
                            vt_positives: threatInfo.positives,
                            vt_total: threatInfo.total,
                            vt_permalink: analysis.permalink,
                            vt_scan_date: new Date(analysis.scanDate * 1000).toISOString(),
                            vt_threat_label: threatInfo.threatLabel,
                            vt_raw_response: analysis.stats,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', fileId);

                    if (updateError) {
                        console.error('❌ Failed to update VT results:', updateError);
                    } else {
                        console.log('✅ VirusTotal results saved to database');
                    }
                    
                    return;
                }
            } catch (error) {
                console.error('⚠️ VirusTotal polling error:', error);
            }
        }

        console.warn('⏰ VirusTotal scan timeout - results will be available later');
    }

    /**
     * Download and decrypt a file
     * @param {Object} fileRecord - File metadata from database
     * @param {CryptoKey} privateKey - User's RSA private key
     * @param {string} currentUserId - Current user ID (to determine if sender or recipient)
     * @returns {Promise<File>} Decrypted file
     */
    async receiveFile(fileRecord, privateKey, currentUserId) {
        try {
            console.log('📥 Downloading file:', fileRecord.file_name);

            // 1. Download encrypted file from storage
            const { data: fileBlob, error: downloadError } = await supabaseClient.storage
                .from('encrypted-files')
                .download(fileRecord.storage_path);

            if (downloadError) {
                console.error('❌ File download failed:', downloadError);
                throw downloadError;
            }

            console.log('✅ File downloaded');

            // 2. Convert encrypted blob to ArrayBuffer
            const encryptedArrayBuffer = await fileBlob.arrayBuffer();

            // 3. Determine which encrypted key to use (sender or recipient)
            const isSender = fileRecord.sender_id === currentUserId;
            let encryptedKeyToUse;
            
            if (isSender && fileRecord.encrypted_key_sender) {
                // Use sender's encrypted key
                encryptedKeyToUse = fileRecord.encrypted_key_sender;
                console.log('🔓 Decrypting file with sender key (you sent this file)');
            } else {
                // Use recipient's encrypted key (or fallback for old files)
                encryptedKeyToUse = fileRecord.encrypted_key;
                console.log('🔓 Decrypting file with recipient key');
            }

            // 4. Decrypt the AES key with private key
            const encryptedKeyBuffer = Uint8Array.from(atob(encryptedKeyToUse), c => c.charCodeAt(0));
            const decryptedKeyBuffer = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                encryptedKeyBuffer
            );

            // 5. Import the decrypted AES key
            console.log('🔓 Decrypting file content...');
            const aesKey = await crypto.subtle.importKey(
                'raw',
                decryptedKeyBuffer,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // 6. Decrypt the file with AES key
            const ivBuffer = Uint8Array.from(atob(fileRecord.iv), c => c.charCodeAt(0));
            const decryptedData = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBuffer },
                aesKey,
                encryptedArrayBuffer
            );

            // 7. Create File object
            const file = new File([decryptedData], fileRecord.file_name, {
                type: fileRecord.file_type
            });

            console.log('✅ File decrypted successfully');
            return file;
        } catch (error) {
            console.error('❌ File receive failed:', error);
            throw error;
        }
    }

    /**
     * Get all files for current user (sent or received)
     * @param {string} userId - Current user ID
     * @returns {Promise<Array>} List of file records
     */
    async getUserFiles(userId) {
        const { data, error } = await supabaseClient
            .from('files')
            .select(`
                *,
                sender:sender_id(id, name, username, avatar_url),
                receiver:receiver_id(id, name, username, avatar_url)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Failed to fetch files:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Global instance
const fileService = new FileService();
