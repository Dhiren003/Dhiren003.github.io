# Update Advisor

A lightweight progressive web app that helps users decide whether to install the latest **iOS** or **Android** update. It detects the device and OS when possible, compares them against current release data, and shows a clear recommendation with community-style signal scores.

Works as a static site on **GitHub Pages**. Multi-source scores can refresh on a schedule via **GitHub Actions** (no separate backend required).

## Features

- **Platform-aware UI** — iPhone shows iOS content only; Android shows Android content only
- **Version detection** — Safari/iOS and Android (including Client Hints where available)
- **Device / model helpers** — screen-based iPhone matching; brand-filtered Android device list
- **Compatibility verdict** — update now / wait / skip, with reasons and release timeline
- **Update probability** — weighted signals (official baseline, MacRumors, optional Reddit & YouTube, historical pattern)
- **Offline-capable** — service worker caches the app shell and data after the first visit

## Project structure

```text
update-advisor/
├── index.html                 # App UI and logic
├── compatibility.json         # Data served to users (Actions may overwrite)
├── compatibility.base.json    # Source of truth for devices, channels, copy
├── sw.js                      # Service worker
├── manifest.webmanifest       # PWA manifest
├── icon-192.png
├── icon-512.png
├── apple-touch-icon.png
├── scripts/
│   └── refresh-scores.mjs     # Score refresh script for GitHub Actions
└── .github/workflows/
    └── refresh-compatibility.yml
```

## How data works

| File | Role |
|------|------|
| `compatibility.base.json` | Devices, release channels, labels, default advice. Edit this when Apple/Google ship new versions or hardware. |
| `compatibility.json` | File the app loads at runtime. Generated or refreshed from the base file by the Actions workflow. |

The workflow reads the base file, updates `updateProbability` / community signal sections for iOS and Android, and commits the result as `compatibility.json`.

## Deploy on GitHub Pages

1. Create a GitHub repository and upload the project files (keep the folder layout above).
2. Open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**, branch **main**, folder **/ (root)**.
4. Save. The site will be available at:

   `https://<username>.github.io/<repo-name>/`

5. Open **Settings → Actions → General** and allow GitHub Actions if prompted.

Public repositories can use GitHub Pages and Actions on the free plan.

## Scheduled score refresh

The workflow **Refresh compatibility.json** runs:

- **On a schedule** — daily at 06:00 UTC  
- **Manually** — Actions tab → select the workflow → **Run workflow**

### Optional secrets

Repo **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `REDDIT_CLIENT_ID` | Reddit API (script app) for r/ios and r/Android sampling |
| `REDDIT_CLIENT_SECRET` | Reddit API secret |
| `YOUTUBE_API_KEY` | YouTube Data API v3 for recent review-style search |

Without these secrets, refresh still runs using MacRumors page signals and built-in baselines. Reddit and YouTube rows use safe defaults until keys are added.

### Changing the schedule

Edit `.github/workflows/refresh-compatibility.yml`:

```yaml
schedule:
  - cron: "0 6 * * *"      # daily 06:00 UTC
  # - cron: "0 6 */2 * *"  # every 2 days
```

## Local use

Serve the folder over HTTP (required for the service worker):

```bash
npx serve .
# or: python3 -m http.server 8080
```

Open the local URL on a phone or browser. The app reads `./compatibility.json` from the same origin.

## Maintaining release data

When a new iOS or Android version ships, or new devices appear:

1. Update **channels**, **devices**, and related copy in `compatibility.base.json`.
2. Copy or merge into `compatibility.json`, **or** run the Actions workflow so scores rebuild on top of the new base.
3. Push to GitHub. Pages will publish the static files; the next scheduled run will refresh scores.

## Browser notes

- **iPhone:** Prefer **Safari** for version detection. Third-party browsers often only expose a frozen OS token.
- **Android:** Chrome can use Client Hints for the real OS version and model; reduced user-agent strings alone may show Android 10.
- Exact phone model is never guaranteed from the web (shared screen sizes, Display Zoom, privacy limits). Users can always pick the model manually.

## License

Use and adapt for your own projects as needed.
