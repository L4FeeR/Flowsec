# VirusTotal CORS Issue - Explained & Solutions

## 🔴 The Problem

VirusTotal scanning **does not work** when running Flowsec directly from GitHub Pages (or any browser-based deployment) due to **CORS (Cross-Origin Resource Sharing)** restrictions.

### What is CORS?

CORS is a security mechanism built into browsers that prevents websites from making requests to different domains unless explicitly allowed. 

**In Flowsec's case:**
- Your app runs on: `https://l4feer.github.io`
- VirusTotal API is at: `https://www.virustotal.com`
- Browser blocks the request because VirusTotal doesn't allow cross-origin requests

### Error You See

```
Access to fetch at 'https://www.virustotal.com/api/v3/files' from origin 'https://l4feer.github.io' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

---

## ✅ Current Behavior (After Fix)

The app now **gracefully handles** this limitation:

1. **File Upload**: ✅ Works perfectly
   - Files are encrypted and uploaded to Supabase
   - All file metadata is saved
   - Files can be downloaded and decrypted

2. **VirusTotal Scanning**: ⊘ Shows "Not Scanned"
   - Status is set to `skipped` instead of `error`
   - Console shows helpful message about CORS
   - App continues working normally

3. **File Manager**: ✅ Works
   - Shows all files
   - Displays "⊘ Not Scanned" badge
   - Download and delete work fine

4. **User Experience**:
   - No crashes or errors
   - Clear indication that scanning is unavailable
   - All other features work normally

---

## 🛠️ Solutions (Choose One)

### Option 1: Backend Proxy (RECOMMENDED for Production)

Create a simple backend API that proxies VirusTotal requests.

**Backend (Node.js/Express example):**

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors()); // Allow your frontend
app.use(express.json());

const VT_API_KEY = 'your-virustotal-api-key';
const VT_BASE_URL = 'https://www.virustotal.com/api/v3';

// Proxy file upload
app.post('/api/virustotal/scan', async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('file', req.file); // Use multer middleware

    const response = await fetch(`${VT_BASE_URL}/files`, {
      method: 'POST',
      headers: { 'x-apikey': VT_API_KEY },
      body: formData
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy analysis results
app.get('/api/virustotal/analysis/:id', async (req, res) => {
  try {
    const response = await fetch(`${VT_BASE_URL}/analyses/${req.params.id}`, {
      headers: { 'x-apikey': VT_API_KEY }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Proxy server running on port 3000'));
```

**Frontend changes:**

```javascript
// js/virustotal.js - Update base URL
constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://your-backend.com/api/virustotal'; // Your proxy
}
```

**Deployment options:**
- Vercel (Node.js)
- Netlify Functions
- AWS Lambda
- Heroku
- Your own VPS

---

### Option 2: CORS Proxy Service (Quick but NOT Recommended)

Use a third-party CORS proxy (only for testing/development):

```javascript
// js/virustotal.js
constructor(apiKey) {
    this.apiKey = apiKey;
    // WARNING: This is insecure and unreliable
    this.baseUrl = 'https://cors-anywhere.herokuapp.com/https://www.virustotal.com/api/v3';
}
```

**⚠️ Issues:**
- Unreliable (proxies often go down)
- Security risk (proxy sees your API key)
- Rate limits
- Not suitable for production

---

### Option 3: Browser Extension (Development Only)

Install a CORS-bypass extension like:
- "CORS Unblock" for Chrome
- "CORS Everywhere" for Firefox

**⚠️ Only use for local testing** - doesn't help your users

---

### Option 4: Disable VirusTotal (Current State)

Just accept that VirusTotal scanning won't work:

**Pros:**
- ✅ No backend needed
- ✅ Keeps app simple
- ✅ File sharing still works perfectly

**Cons:**
- ❌ No malware scanning
- ❌ Users must manually scan files

**To permanently disable VirusTotal UI elements:**

```javascript
// js/file-service.js - Remove VT scanning entirely
async sendFile(file, senderId, receiverId, recipientPublicKey) {
    // ... encryption and upload code ...
    
    // Skip VirusTotal completely
    const vtStatus = 'disabled';
    const vtScanId = null;
    
    // ... rest of the code ...
}
```

---

## 📋 Implementation Checklist (Option 1 - Backend Proxy)

### Backend Setup:

- [ ] Choose hosting platform (Vercel/Netlify/AWS/Heroku)
- [ ] Create Node.js/Python backend
- [ ] Add `/api/virustotal/scan` endpoint
- [ ] Add `/api/virustotal/analysis/:id` endpoint
- [ ] Add `/api/virustotal/report/:hash` endpoint
- [ ] Add CORS headers for your GitHub Pages domain
- [ ] Add rate limiting (VirusTotal: 4 req/min free tier)
- [ ] Deploy backend
- [ ] Get backend URL

### Frontend Changes:

- [ ] Update `js/virustotal.js` with backend URL
- [ ] Remove `x-apikey` header (backend handles this)
- [ ] Test file upload → scan → results flow
- [ ] Update documentation

### Example Backend URLs:

```javascript
// Option A: Vercel
this.baseUrl = 'https://flowsec-proxy.vercel.app/api/virustotal';

// Option B: Netlify
this.baseUrl = 'https://flowsec-proxy.netlify.app/.netlify/functions/virustotal';

// Option C: Your server
this.baseUrl = 'https://api.yourserver.com/virustotal';
```

---

## 🔒 Security Considerations

### If Using Backend Proxy:

1. **Never expose your VirusTotal API key** in frontend code
2. **Add authentication** to your proxy endpoints
3. **Validate file sizes** before proxying (max 32MB for VT free tier)
4. **Rate limit** your proxy (VT allows 4 req/min)
5. **Log requests** for debugging and abuse prevention

### API Key Security:

```javascript
// ❌ BAD - Exposed in frontend
const VT_API_KEY = '8a2a9809b18ab04dc168df26000af4490beeaf2d4a42e1b90f1989b23d2bb630';

// ✅ GOOD - Stored in backend environment variable
process.env.VIRUSTOTAL_API_KEY
```

---

## 📊 Cost Analysis

### Current Setup (No Backend):
- GitHub Pages: FREE
- Supabase (Storage + DB): FREE (up to limits)
- **Total: $0/month**

### With Backend Proxy:
- GitHub Pages: FREE
- Supabase: FREE
- Backend hosting:
  - Vercel: FREE (hobby tier, enough for most use)
  - Netlify: FREE (125k requests/month)
  - AWS Lambda: FREE (1M requests/month)
  - Heroku: $7/month (basic dyno)
- **Total: $0-7/month**

---

## 🎯 Recommended Solution

For **production use**, implement **Option 1 (Backend Proxy)** using:

1. **Vercel** (easiest, free tier is generous)
2. **Netlify Functions** (also easy, good free tier)
3. **AWS Lambda** (more complex, very scalable)

For **personal/testing use**, you can keep the current state (Option 4) where VirusTotal is skipped.

---

## 📚 Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [VirusTotal API Documentation](https://developers.virustotal.com/reference/overview)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)

---

## ✨ Summary

**What's Working:**
- ✅ End-to-end encrypted file sharing
- ✅ File upload/download
- ✅ File manager
- ✅ All chat features

**What's Not Working:**
- ❌ VirusTotal malware scanning (CORS blocked)

**What You Should Do:**
- **Short term**: Use app as-is (files upload but show "Not Scanned")
- **Long term**: Set up a simple backend proxy for VirusTotal API
- **Alternative**: Remove VirusTotal features entirely

The app is fully functional for secure file sharing - VirusTotal is an optional enhancement!
