# 🚀 Quick Deploy Commands

Copy and paste these commands in PowerShell:

## 1. Initialize Git Repository
```powershell
cd "C:\Users\Muhamed Lafeer\Desktop\project\Flowsec"
git init
git add .
git commit -m "Initial commit: FlowSec encrypted chat app"
```

## 2. Create GitHub Repository
Go to: https://github.com/new
- Name: `flowsec`
- Don't initialize with README
- Click "Create repository"

## 3. Push to GitHub
```powershell
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/flowsec.git
git branch -M main
git push -u origin main
```

## 4. Enable GitHub Pages
1. Go to: `https://github.com/YOUR_USERNAME/flowsec/settings/pages`
2. Under **Source**, select: **GitHub Actions**
3. Done! Your site will be live at: `https://YOUR_USERNAME.github.io/flowsec/`

## 5. Update Supabase Settings
In Supabase Dashboard:
1. **Authentication → URL Configuration**
2. Add Site URL: `https://YOUR_USERNAME.github.io/flowsec/`
3. Add Redirect URL: `https://YOUR_USERNAME.github.io/flowsec/**`

---

## Future Updates
```powershell
git add .
git commit -m "Your update message"
git push
```

That's it! Auto-deploys on every push! 🎉
