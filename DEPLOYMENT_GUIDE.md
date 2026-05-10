# Deployment Guide for Kalika Store

If you are experiencing a **white screen** after hosting your app, follow these steps to ensure a successful deployment.

## 1. Environment Variables (CRITICAL)
Your hosting provider (Vercel, Netlify, etc.) **cannot** read your local `.env` file. You must manually add these keys in their dashboard settings:

Go to **Project Settings** > **Environment Variables** and add:
- `GEMINI_API_KEY`: Your Google Gemini API Key.
- `VITE_GOOGLE_MAPS_API_KEY`: (Optional) For live location services.
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc. (Check `src/firebase.ts` for all required keys).

## 2. Correct Build & ZIP Procedure
If you are uploading a ZIP file manually:
1. Run `npm run build` in your terminal.
2. Open the **`dist`** folder.
3. Select **all files inside** the `dist` folder.
4. Right-click and choose **Compress/ZIP**.
5. Upload **this specific ZIP** to the hosting provider.
   - ❌ **Do NOT** ZIP the whole project folder.
   - ❌ **Do NOT** ZIP the `dist` folder itself (the host needs to see `index.html` at the top level of the ZIP).

## 3. Client-Side Routing Fixes
We have included fallback configurations in the root of the project to prevent "404 Not Found" when you refresh a page:
- **Netlify:** `public/_redirects` handles this.
- **Vercel:** `vercel.json` handles this.

## 4. Port Configuration
The application is configured to run on **Port 3000** for development in this environment. However, when deployed, the hosting provider will automatically assign a port. No changes are needed there.

---
**Need more help?**
Check the browser console (Press `F12` > `Console`) on the white screen. It will tell you exactly what file is failing to load!
