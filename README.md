# Halcyon — Real Estate Advisory
## Vercel Deployment Guide

### What's in this folder
```
halcyon-vercel/
├── api/
│   └── chat.js          ← Serverless proxy (keeps API key secret)
├── public/
│   └── index.html       ← The Halcyon app UI
├── vercel.json          ← Vercel routing config
├── package.json
└── .gitignore
```

---

### Deploy in 5 steps

**Step 1 — Create a GitHub repository**
1. Go to github.com → New repository
2. Name it `halcyon` (or anything you like)
3. Set to Private
4. Do NOT add README/gitignore (we have our own)
5. Click Create

**Step 2 — Push this folder to GitHub**

Open terminal in this folder and run:
```bash
git init
git add .
git commit -m "Halcyon initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/halcyon.git
git push -u origin main
```
*(Replace YOUR_USERNAME with your GitHub username)*

**Step 3 — Connect to Vercel**
1. Go to vercel.com → Log in with GitHub
2. Click "Add New → Project"
3. Import your `halcyon` repository
4. Leave all settings as default
5. Click Deploy — it will fail (no API key yet) — that's fine

**Step 4 — Add your Anthropic API key**
1. In Vercel dashboard → your project → Settings → Environment Variables
2. Add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-...` (your key from console.anthropic.com)
   - Environment: Production ✓, Preview ✓, Development ✓
3. Click Save

**Step 5 — Redeploy**
1. Go to Deployments tab
2. Click the three dots on latest deployment → Redeploy
3. Wait ~30 seconds
4. Visit your `https://halcyon-xxxx.vercel.app` URL 🎉

---

### Your API key is safe
The key lives only in Vercel's encrypted environment variables.
It is never sent to the browser, never in the HTML source, never in logs.
The `/api/chat.js` function runs server-side and adds the key to each Anthropic request.

---

### Custom domain (optional)
Vercel dashboard → your project → Settings → Domains → Add your domain.
Works with any domain registrar.

---

### Updating the app
Just push to GitHub — Vercel auto-deploys in ~30 seconds:
```bash
git add .
git commit -m "update"
git push
```
