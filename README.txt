Ganesa Workspace v5.5 (split files)
Files:
- index.html
- styles.css
- app.js
- manifest.json
- sw.js (not needed; service worker is registered dynamically)
- icons (not provided)

IMPORTANT:
1. To enable Google Sheets sync, create OAuth Client ID (Web) and API Key in Google Cloud Console.
   - Set Authorized JS origins to your origin (e.g., http://localhost:8000)
   - Enable Google Sheets API
   - Paste CLIENT_ID and API_KEY into app.js top variables.

2. Run a local server to test (recommended):
   python -m http.server 8000
   open http://localhost:8000

3. This package is single-origin friendly. For best OAuth results host via HTTPS or use localhost.

If you want, reply and I'll:
- add example icons,
- pre-fill CLIENT_ID placeholders (don't send credentials here),
- or produce a hosted preview.
