# Password-Based Authentication & Multi-Device E2EE

## Overview

Flowsec now supports password-based authentication combined with email magic links. The password is used to encrypt your private encryption keys, enabling secure multi-device access to your encrypted messages.

## How It Works

### 1. **Signup Flow**
- User provides: name, username, email, **password**, gender, profile picture
- Password requirements: minimum 8 characters
- Password must match confirmation field
- After email verification via magic link:
  - RSA key pair generated (2048-bit)
  - Private key encrypted with password using PBKDF2 + AES-GCM
  - Encrypted private key stored on server
  - Public key stored on server (unencrypted)
  - Password stored temporarily in sessionStorage (cleared on logout)

### 2. **Login Flow**
- User enters: email + password
- Magic link sent to email
- After clicking magic link:
  - Password retrieved from sessionStorage
  - Encrypted private key downloaded from server
  - Private key decrypted locally using password
  - Private key loaded into memory for message decryption
  - Private key cached in localStorage for faster future access

### 3. **Multi-Device Access**
- Same account can be used on multiple devices
- Password required on each device to decrypt private keys
- Old encrypted messages readable from any device with correct password
- Zero-knowledge: server stores encrypted keys but cannot decrypt them

## Security Model

### Encryption Details
- **Private Key Storage**: Encrypted with AES-GCM-256
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Random Salt**: 16 bytes per encrypted key
- **Random IV**: 12 bytes per encryption operation
- **Format**: Base64-encoded (salt + IV + encrypted key)

### Zero-Knowledge Architecture
- Password **never** sent to server
- Password **never** stored permanently (only sessionStorage during session)
- Server stores encrypted private keys but cannot decrypt them
- Decryption happens **client-side only**
- Wrong password = cannot decrypt keys = cannot read messages

## Database Schema

### Profiles Table Update
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT;
```

This column stores:
- User's RSA private key (JWK format)
- Encrypted with user's password (PBKDF2-derived AES key)
- NULL for users who haven't set up encryption yet

## Implementation Files

### Frontend Changes

1. **pages/signup.html**
   - Added password input field
   - Added confirm password field
   - Client-side validation for password match

2. **pages/login.html**
   - Added password input field
   - Help text explaining password usage

3. **js/auth.js**
   - Login handler: collects password, stores in sessionStorage
   - Signup handler: validates password match, stores in sessionStorage
   - Minimum password length: 8 characters

4. **css/auth.css**
   - Styling for password input fields
   - Help text styling

5. **pages/complete-profile.html**
   - Retrieves password from sessionStorage
   - Encrypts private key with password
   - Uploads encrypted key to server

6. **js/encryption.js**
   - `encryptPrivateKeyForBackup()` - Encrypts private key for server storage
   - `decryptPrivateKeyFromBackup()` - Decrypts private key from server
   - PBKDF2 key derivation with random salt

7. **js/chat.js**
   - `loadPrivateKey()` - Downloads encrypted key from server if not in localStorage
   - Automatic decryption using password from sessionStorage
   - Caches decrypted key in localStorage for performance
   - Clears passwords on sign-out

## Migration Steps

### For New Users
1. Sign up with email + password
2. Verify email via magic link
3. Complete profile (keys auto-generated and encrypted)
4. Start chatting with E2EE

### For Existing Users (Without Password)
1. Existing keys in localStorage continue to work
2. To enable multi-device support:
   - Sign out
   - Sign up again with password
   - Or: Feature to be added - "Set Password" in settings

## Testing Checklist

- [ ] Run SQL migration: `add_encrypted_private_key_column.sql`
- [ ] Test signup with password
- [ ] Test login with password
- [ ] Test password mismatch validation
- [ ] Test multi-device access (same account, different browser/device)
- [ ] Test message decryption after login
- [ ] Test password cleared on sign-out
- [ ] Test wrong password error handling
- [ ] Test fallback to email-only auth (for backward compatibility)

## Important Notes

### Password Security
- Use a strong, unique password for Flowsec
- Password cannot be reset (zero-knowledge system)
- **If you forget your password, you cannot decrypt old messages**
- Consider using a password manager

### Browser Data
- Clearing browser data will remove cached keys from localStorage
- Keys can be re-downloaded from server using password
- sessionStorage cleared automatically when tab closes

### Incognito/Private Mode
- Keys not cached in localStorage
- Downloaded fresh each session using password
- More secure but slower initial load

## Future Enhancements

1. **Password Reset/Recovery**
   - Could implement key escrow with recovery codes
   - Trade-off: reduces zero-knowledge security

2. **Key Backup Codes**
   - Generate recovery codes during signup
   - Print/save codes for emergency access

3. **Password Strength Indicator**
   - Visual feedback during signup
   - Enforce stronger passwords

4. **Key Rotation**
   - Periodically re-encrypt with new password
   - Migrate to newer encryption standards

5. **Biometric Support**
   - Device-local password storage with fingerprint/face unlock
   - Never send biometrics to server

## Troubleshooting

### "Wrong password or corrupted key"
- Ensure you're using the correct password
- Check browser console for detailed error logs
- Try clearing localStorage and logging in again

### "Private key not found"
- Check if `encrypted_private_key` column exists in database
- Verify SQL migration was run successfully
- Check Supabase logs for insert errors

### "Cannot decrypt messages"
- Ensure private key loaded successfully (check console)
- Verify sender's public key available
- Check message format in database

### "Keys not syncing across devices"
- Ensure using same password on all devices
- Check sessionStorage has `tempPassword` after login
- Verify `encrypted_private_key` exists in profiles table

## API Reference

### EncryptionService Methods

```javascript
// Encrypt private key for server backup
const encrypted = await EncryptionService.encryptPrivateKeyForBackup(privateKey, password);

// Decrypt private key from server backup  
const privateKey = await EncryptionService.decryptPrivateKeyFromBackup(encrypted, password);

// Store in localStorage (device cache)
await EncryptionService.storePrivateKey(privateKey, userId, password);

// Retrieve from localStorage
const privateKey = await EncryptionService.retrievePrivateKey(userId, password);
```

### SessionStorage Keys

- `tempPassword` - Password during login session (cleared on logout)
- `pendingPassword` - Password during signup flow (cleared after profile complete)
- `tempEmail` - Email during login (for convenience)

## Conclusion

Password-based authentication enables secure multi-device access while maintaining end-to-end encryption. The zero-knowledge architecture ensures that even if the server is compromised, user messages remain encrypted and unreadable without the user's password.
