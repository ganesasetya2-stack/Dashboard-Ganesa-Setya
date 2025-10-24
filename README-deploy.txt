DailyReportGS - Ready to Deploy (minimal)
Project: dailyreportgs
Theme: minimalis modern, biru (#2f6f95)
Login: separate index.html (PIN-based), dashboard at dashboard.html

How to run locally:
1. Extract files.
2. From project root run:
   python -m http.server 8000
3. Open http://localhost:8000/index.html (or just /)

Deploy notes for Vercel / Netlify / GitHub Pages:
- Ensure these files exist at root: index.html, dashboard.html, app.js, login.js, styles.css, manifest.json
- If using GitHub Pages, push repo root to gh-pages branch or main with docs folder configured.
- For Vercel, connect repo and deploy - project name can be 'dailyreportgs'.

Security:
- PIN is hashed via SHA-256 and stored in localStorage under key 'ganesa_v5_5_appdata' -> settings.pinHash
- Session flag stored as localStorage 'ganesa_logged_in' = '1' (for browser-only testing)
