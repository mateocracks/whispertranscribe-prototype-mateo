# Deploy this app on Vercel (shareable link)

The **hosted** version does **not** run Whisper on your Mac. It sends audio to **OpenAI’s transcription API** and uses the same key for the optional **AI tabs** (clean / social / blog). Your friends only need the public URL; you keep the API key in Vercel (it is never put in the browser).

## Steps

1. Push this repo to GitHub (or connect the folder however you use Vercel).
2. In [Vercel](https://vercel.com), **Import** the project. Use the defaults: build `npm run build`, output folder `dist` (already set in `vercel.json`).
3. Under **Project → Settings → Environment Variables**, add:
   - **`OPENAI_API_KEY`** — your secret key from [OpenAI](https://platform.openai.com/). Apply to **Production** (and Preview if you want previews to work).
4. **Redeploy** after saving variables so new builds see the key.

## Limits and cost (plain language)

- **OpenAI** charges for transcription and for chat (AI tabs). Anyone with your link can use the app, so your bill can grow if the link spreads—treat the key like a credit card on file.
- **Audio file size:** OpenAI accepts roughly up to **25 MB** per file. **Vercel’s free tier** often limits how big a single upload can be (on the order of a few megabytes). If uploads fail on a large file, try a shorter clip or check Vercel’s plan limits.
- **How long a run can take:** Long recordings can take more than a few seconds. **`vercel.json`** sets **`maxDuration`: 300** seconds for `api/transcribe.js`; on **free** Vercel, the actual cap may be much lower unless your plan allows longer functions. If transcription times out, use shorter audio or upgrade Vercel.

## Local development vs hosted

- **Local:** `npm run dev:all` — Whisper on your machine, API on port **8787**, UI proxied from Vite.
- **Test like production:** install the Vercel CLI, then from the project folder run `npm run vercel:dev` (or `vercel dev`). To point the Vite dev server at that API instead of 8787, set **`VITE_PROXY_LOCAL_API=0`** when starting Vite so `/api` is not proxied to localhost.

## Files involved

- `api/health.js` — tells the UI it is in **cloud** mode.
- `api/transcribe.js` — receives the upload, calls OpenAI, returns transcript + segments.
- `api/ai-enhance.js` — same AI polish behavior as the local Express route.
- `lib/` — shared logic used by both the Vercel functions and `server/index.mjs`.
