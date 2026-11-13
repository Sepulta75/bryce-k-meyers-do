# Dr. Bryce K. Meyers, DO, MPH, FAAFP — landing page

A single-page, dependency-free landing site for Bryce K. Meyers, DO, MPH, FAAFP —
board-certified family physician, U.S. Army veteran, and physician executive in
Columbia, Maryland.

## Stack

Plain static HTML/CSS/JS. No build step, no framework, no package manager.

| File | Purpose |
|---|---|
| `index.html` | All page content |
| `styles.css` | Design system and layout |
| `script.js` | Nav, scroll reveal, FAQ accordion, form handling |
| `img/headshot-web.jpg` | Hero portrait (web-optimised, 880×1100) |

## Local preview

```bash
npx live-server --port=5173
# or
python -m http.server 5173
```

## Deployment

Pushed to `main` → GitHub Actions (`.github/workflows/deploy.yml`) uploads the
static site and publishes it via GitHub Pages. No secrets or build tooling
required.

Pages source is set to **GitHub Actions** (not the legacy `gh-pages` branch).

## Notes

Informational profile compiled from publicly available sources. Not medical
advice. Contact details shown are the publicly listed practice details.
