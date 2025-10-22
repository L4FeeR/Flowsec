# Quick Setup Guide - Password Authentication

## Step 1: Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add encrypted_private_key column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT;

COMMENT ON COLUMN profiles.encrypted_private_key IS 
'Password-encrypted private key for multi-device E2EE support. Encrypted client-side with PBKDF2-derived AES key.';
```

## Step 2: Test Locally

1. **Open the project** in a browser (or use Live Server)

2. **Test Signup Flow:**
   - Go to signup page
   - Fill in all fields including password (min 8 chars)
   - Ensure password and confirm password match
   - Submit and check email for magic link
   - Click magic link
   - Complete profile setup
   - Check console logs for "✅ Private key encrypted for backup"

3. **Test Login Flow:**
   - Sign out completely
   - Go to login page
   - Enter email + password
   - Check email for magic link
   - Click magic link
   - Should auto-login and load private key from server
   - Check console for "✅ Private key decrypted from server backup successfully"

4. **Test Multi-Device:**
   - Open incognito/private window
   - Login with same account + password
   - Should be able to decrypt old messages
   - Check console for key download logs

## Step 3: Verify Console Logs

### During Signup (after magic link):
```
🔐 Encrypting private key for server backup...
✅ Private key encrypted for backup
✅ Profile created successfully
```

### During Login (from new device):
```
⚠️ No private key found in localStorage. Checking server...
🔐 Found encrypted private key on server, attempting to decrypt...
🔓 Decrypting private key from server backup...
✅ Private key decrypted from server backup successfully
✅ Private key cached in localStorage
```

### During Message Send/Receive:
```
🔐 Encrypting message...
✅ Message encrypted
✅ Message saved to database
```

## Step 4: Deploy

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Add password-based authentication for multi-device E2EE"
   git push origin main
   ```

2. **GitHub Actions** will auto-deploy to GitHub Pages

3. **Test on production** URL: https://l4feer.github.io/Flowsec/

## Troubleshooting

### Password not being captured
- Check browser console for errors
- Verify sessionStorage has `tempPassword` after login
- Check auth.js password validation logic

### Private key not encrypted
- Verify `encryptPrivateKeyForBackup()` is being called
- Check complete-profile.html logs
- Look for "Encrypting private key for server backup" in console

### Cannot decrypt on login
- Wrong password - try again
- Check if encrypted_private_key exists in database
- Verify PBKDF2 iterations match (100,000)
- Check salt extraction in decryption logic

### Database insert fails
- Run the SQL migration (Step 1)
- Check Supabase table schema
- Verify RLS policies allow insert

## Expected Database State

After successful signup, profiles table should have:
- `id` - User UUID
- `name` - Display name
- `username` - Unique username
- `gender` - Male/Female/Other
- `avatar_url` - Profile picture URL
- `public_key` - RSA public key (base64)
- `key_fingerprint` - SHA-256 fingerprint
- `encrypted_private_key` - **NEW** - Encrypted private key (base64)

## Files Modified

✅ pages/signup.html - Password fields added
✅ pages/login.html - Password field added
✅ js/auth.js - Password collection logic
✅ css/auth.css - Password field styling
✅ pages/complete-profile.html - Key encryption and upload
✅ js/encryption.js - Backup encryption methods
✅ js/chat.js - Key download and decryption
✅ add_encrypted_private_key_column.sql - Database migration

## Next Steps

1. Run SQL migration
2. Test locally (all 3 tests above)
3. Deploy to production
4. Test on live site
5. Document any issues

Good luck! 🚀
