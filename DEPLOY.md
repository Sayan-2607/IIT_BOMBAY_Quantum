# Publish QuantumShield AI (so anyone can experience it)

This is a static site — no server, no build. Pick the easiest path and you'll
have a public URL to share in ~1 minute. **Webcam features need HTTPS**, which
all three hosts below provide automatically.

## Option 1 — Netlify Drop (fastest, no account juggling)
1. Go to **app.netlify.com/drop**
2. Drag the whole `quantumshield-ai` folder onto the page
3. You get a live `https://…netlify.app` URL instantly. Share it with anyone.

## Option 2 — Vercel
1. Push this folder to a GitHub repo
2. Import it at **vercel.com/new** → Framework preset: **Other** → Deploy
3. Live at `https://…vercel.app`. (`vercel.json` is already included.)

## Option 3 — GitHub Pages
1. Create a repo, push these files (the included `.nojekyll` is required)
2. Repo **Settings → Pages → Source: deploy from branch → main / root**
3. Live at `https://<user>.github.io/<repo>/`
   (All asset paths are relative, so it works under a subpath.)

## Run locally first (optional)
```bash
npx serve .        # or: python -m http.server 8080
```
Open the printed address. The webcam works on `localhost` and on any HTTPS host.

## Notes for sharing widely
- Everything runs in the visitor's browser — the quantum simulation, the live
  job stream, webcam processing. Nothing is uploaded anywhere.
- Chart.js and the fonts load from a CDN, so visitors need to be online.
- First-time visitors get the landing cover + a short guided tour automatically
  (re-openable via the **? tour** button in the top bar).
