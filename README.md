# Dr. Bryce K. Meyers, DO, MPH, FAAFP, CMRO — landing page

Single-page site for Bryce K. Meyers, DO, MPH, FAAFP, CMRO — board-certified
family physician, U.S. Army veteran, and physician executive at Be Well Health
Center at Tysons (Premise Health) in McLean, Virginia.

Built with **Vite + TypeScript**, linted with **typescript-eslint** (type-aware,
strict), styled with **Tailwind v4 utilities layered over the original design
system**, and organised as **clean architecture** so delivery channels can be
swapped without touching the page.

> The page is deliberately unlisted: `noindex` meta tags plus an `X-Robots-Tag`
> header from nginx.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck → lint → production build
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc --noEmit` (app + node configs) then `vite build` → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Strict TypeScript, no emit |
| `npm run lint` | ESLint 9 flat config, `strictTypeChecked` + `stylisticTypeChecked` |

## Architecture

Dependencies point inward. The domain knows nothing about the browser, Telegram,
or `fetch`; presentation never talks to a connector directly.

```
src/
├── domain/                          # entities + ports, zero dependencies
│   ├── contact-request.ts           # ContactRequest, validation, message formatting
│   └── ports/message-connector.ts   # MessageConnector, ConnectorStatus, SendOutcome
├── application/                     # use cases, orchestration
│   ├── submit-contact-request.ts    # delivers via the first ready connector
│   └── connector-registry.ts        # composition list of channels
├── infrastructure/                  # adapters — the only place with I/O + env
│   ├── config/env.ts                # the single reader of import.meta.env
│   └── connectors/
│       ├── telegram-connector.ts    # Bot API (proxy or direct), DISABLED by default
│       └── memory-sink.ts           # inspection-only sink, never transmits
├── presentation/                    # DOM controllers
│   ├── controllers/site-chrome.ts   # nav, drawer, reveal, accordion, anchors, year
│   ├── controllers/contact-form.ts  # form → validation → use case → status copy
│   ├── dom.ts
│   └── styles/                      # main.css (Tailwind layers) + site.css (design system)
└── main.ts                          # composition root: config → connectors → UI
```

**Adding a channel** (email, SMS, CRM, a serverless relay): implement
`MessageConnector` in `infrastructure/connectors/`, append it in
`application/connector-registry.ts`. Nothing else changes.

## Connectors

Every connector ships **disabled**. The contact form still acknowledges the
visitor, but until a channel is switched on nothing is transmitted — the same
behaviour as the pre-refactor site, now stated explicitly in the console.

Inspect the live state from the browser console:

```js
__connectors.status()      // per-channel readiness and why
__connectors.lastMessage() // the message that would have been sent
```

### Telegram

Configuration lives in env vars (see `.env.example`); Vite inlines `VITE_*` at
build time.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_TELEGRAM_ENABLED` | `false` | master switch — only the string `true` enables it |
| `VITE_TELEGRAM_MODE` | `proxy` | `proxy` (recommended) or `direct` |
| `VITE_TELEGRAM_PROXY_URL` | — | your relay endpoint, used in `proxy` mode |
| `VITE_TELEGRAM_BOT_TOKEN` | — | Bot API token, only for `direct` mode |
| `VITE_TELEGRAM_CHAT_ID` | — | destination chat/channel id |
| `VITE_CONTACT_FALLBACK` | `phone` | what the acknowledgement points to while off |

**Security:** a `VITE_*` value is compiled into the JavaScript bundle, so a bot
token used in `direct` mode is readable by every visitor and can be used to post
as the bot. `proxy` mode exists for that reason — keep the token in a small
server-side relay that accepts:

```json
{ "channel": "telegram", "chatId": "…", "subject": "…", "text": "…", "replyTo": "…" }
```

`direct` mode logs a warning at runtime and is intended only for local demos.

## Deployment

Two targets, one codebase.

**GitHub Pages** — push to `main`; `.github/workflows/deploy.yml` runs
typecheck + lint + build and publishes `dist/`. `VITE_SITE_BASE` is set to
`/<repo>/` automatically because project pages are served from a subpath.

**Render** — the service runs as a Docker web service. `Dockerfile` is a
two-stage build (Node compiles the bundle, nginx serves it) and `nginx.conf`
adds gzip, immutable caching for hashed assets, the `X-Robots-Tag: noindex`
header, and a fallback to `index.html`. Build args mirror the env vars above and
every connector defaults to off.

## Notes

Informational profile compiled from publicly available sources. Not medical
advice. Contact details shown are the publicly listed practice details.
