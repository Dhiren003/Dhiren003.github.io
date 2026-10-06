# Update Advisor (GitHub Pages + Actions)

## Deploy
1. Push this folder to a GitHub repo.
2. Settings → Pages → Deploy from branch `main` / root.
3. Settings → Actions → allow Actions.
4. Actions → **Refresh compatibility.json** → Run workflow (optional test).

## Optional secrets (Actions)
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `YOUTUBE_API_KEY`

Without secrets, MacRumors + baseline scores still refresh daily (06:00 UTC).

## Edit data
- Devices / release notes: edit `compatibility.base.json`
- Live scores file served to users: `compatibility.json` (updated by Actions)
