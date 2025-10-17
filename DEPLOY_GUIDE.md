# 🚀 Deployment Guide - GitHub Pages

## Step 1: Prepare Your Repository

Your project is now clean and ready! Here's what's included:

**Essential Files:**
- ✅ `index.html` - Landing page
- ✅ `pages/` - All app pages (signup, login, chat)
- ✅ `js/` - JavaScript logic
- ✅ `css/` - Styles
- ✅ `.github/workflows/deploy.yml` - Auto-deployment workflow
- ✅ `.gitignore` - Excludes sensitive files
- ✅ `README.md` - Documentation

**Database Setup Files:**
- ✅ `QUICK_SETUP.sql` - Creates profiles table
- ✅ `ADD_ENCRYPTION_KEYS.sql` - Adds encryption columns
- ✅ `CREATE_MESSAGES_TABLE.sql` - Creates messages table

## Step 2: Update Configuration

**IMPORTANT:** Before deploying, update `js/config.js` with your Supabase credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key-here';
```

## Step 3: Initialize Git Repository

```bash
cd "C:\Users\Muhamed Lafeer\Desktop\project\Flowsec"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: FlowSec encrypted chat app"
```

## Step 4: Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click **"New repository"**
3. Name it: `flowsec` or any name you prefer
4. **DO NOT** initialize with README (we already have one)
5. Click **"Create repository"**

## Step 5: Push to GitHub

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/flowsec.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 6: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** (left sidebar)
4. Under **Source**, select: **GitHub Actions**
5. Wait a few seconds for the workflow to run

## Step 7: Access Your Site

Your site will be live at:
```
https://YOUR_USERNAME.github.io/flowsec/
```

The GitHub Action will automatically deploy on every push to `main` branch!

## Troubleshooting

### Issue: 404 Page Not Found

**Solution:** Make sure `index.html` is in the root directory, not in a subfolder.

### Issue: Supabase Connection Failed

**Solution:** 
1. Check `js/config.js` has correct credentials
2. Verify Supabase URL starts with `https://`
3. Make sure you're using the **anon public** key, not the service role key

### Issue: CORS Errors

**Solution:** In Supabase dashboard:
1. Go to **Authentication → URL Configuration**
2. Add your GitHub Pages URL to **Site URL**
3. Add to **Redirect URLs**: `https://YOUR_USERNAME.github.io/flowsec/**`

### Issue: Users Can't Sign Up

**Solution:** Make sure you've run all SQL setup scripts in Supabase:
1. `QUICK_SETUP.sql` - Creates tables
2. `ADD_ENCRYPTION_KEYS.sql` - Adds encryption columns
3. Check that RLS policies allow INSERT for authenticated users

## Custom Domain (Optional)

To use a custom domain like `flowsec.yourdomain.com`:

1. In your repository: **Settings → Pages → Custom domain**
2. Enter your domain: `flowsec.yourdomain.com`
3. In your DNS provider, add a CNAME record:
   ```
   flowsec.yourdomain.com → YOUR_USERNAME.github.io
   ```
4. Wait for DNS propagation (5-30 minutes)
5. Enable **Enforce HTTPS**

## Updating Your Site

Every time you make changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

GitHub Actions will automatically redeploy! ⚡

## Monitoring

Check deployment status:
1. Go to **Actions** tab in your repository
2. See the workflow runs
3. Green ✅ = Success
4. Red ❌ = Failed (click to see logs)

## Security Checklist

Before going live:

- [ ] Updated Supabase credentials in `js/config.js`
- [ ] Added GitHub Pages URL to Supabase redirect URLs
- [ ] Ran all SQL setup scripts
- [ ] Tested signup and login flow
- [ ] Verified encryption keys generate properly
- [ ] Checked browser console for errors
- [ ] Tested on mobile devices

## Next Steps

1. Share your site URL with users
2. Monitor Supabase dashboard for activity
3. Check GitHub Pages usage/bandwidth
4. Set up custom domain (optional)
5. Add more features!

---

🎉 **Congratulations!** Your encrypted chat app is now live on the internet!

Need help? Check the console logs (F12) or open an issue on GitHub.
