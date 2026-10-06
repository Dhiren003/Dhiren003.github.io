# Update Advisor

Helps you decide whether to install the latest iOS or Android update. Open it on your phone, confirm your device, and get a clear recommendation based on current releases and community signals.

## What it does

- Detects iPhone or Android and shows only the matching platform
- Suggests whether to update now, wait, or skip
- Explains why, with release timeline and confidence-style scores
- Works offline after the first visit

## Changelog

### Added
- Android support with the same recommendation flow as iOS
- Brand-aware Android device suggestions
- Multi-source update confidence (public discussion signals plus baseline release data)
- Optional scheduled refresh of confidence scores

### Fixed
- iOS version detection when the browser freezes the system version in the user agent
- iPhone model pre-selection when several models share the same screen size
- Android version and model detection under reduced browser user agents
- Cross-platform content so iPhone users never see Android advice and vice versa

### Updated
- Latest iOS and Android release information
- Device lists for recent iPhone and Android hardware
- Recommendation wording for current stable releases
