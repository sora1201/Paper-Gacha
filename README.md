<div align="center">
  <img src="public/paper-gacha-app-icon.png" alt="Paper Gacha app icon" width="112" height="112">

A bilingual, local-first paper discovery app powered by OpenAlex. Add free-form keywords for expert, related, and deliberately different themes; Paper Gacha draws new papers without repeating anything previously shown in the browser.

  **A small discovery, every day.**

  A bilingual, local-first web app for discovering research papers beyond your usual reading list.
  Paper Gacha combines work from your core field, adjacent topics, and deliberately different areas into one balanced draw.
</div>

## Why Paper Gacha?

Academic search is excellent when you already know what you need. Paper Gacha is designed for the moment when you do not: it turns exploration into a quick, repeatable ritual while still giving you control over the mix.

Choose topics from the [OpenAlex](https://openalex.org/) catalog, decide how many papers you want from each category, and draw a fresh reading list. Previously drawn papers are excluded in your browser, helping every draw surface something new.

## Features

- **Three-part discovery mix** — balance papers from your expert, related, and outside-interest topics.
- **OpenAlex topic search** — find and combine topics from an open catalog of scholarly works.
- **Configurable draws** — choose the number of papers per category and limit results to the past 1, 3, 5, or 10 years (or use all years).
- **No-repeat discovery** — papers already drawn on the current browser are excluded from future results.
- **Favorites and history** — save papers for later and revisit up to 100 recent draws.
- **Useful paper details** — see authors, publication year, abstract, topics, citation count, DOI, and open-access links when available.
- **English and Japanese UI** — the initial language follows the browser, and can be changed at any time in Settings.
- **Local-first preferences** — settings, favorites, history, and drawn-paper IDs stay in the browser's `localStorage`.
- **Responsive interface** — designed for both desktop and mobile reading workflows.

## How it works

1. Open **Settings** and search for at least one OpenAlex topic in every category you want to use.
2. Set the number of expert, related, and other papers in each draw.
3. Optionally choose a publication-year range.
4. Return to **Gacha** and draw a new set of papers.
5. Favorite interesting results, open the best available source, or revisit a draw from **History**.

For each selected topic, the Cloudflare Worker requests a sample of eligible, non-retracted works from OpenAlex. The browser shuffles those candidates, alternates across the selected topics in each category, and skips IDs recorded by earlier draws. A draw can contain fewer papers than requested when OpenAlex does not return enough unseen candidates.

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, React Router, i18next, Lucide React |
| Build | Vite 7 |
| API | Cloudflare Workers |
| Research data | OpenAlex API |
| Persistence | Browser `localStorage`; portable JSON backup export/import |
| Tests | Vitest |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ or 22.12+
- npm

### Install

```bash
git clone <your-fork-or-repository-url>
cd Paper-Gacha
npm install
npm start
```

`npm start` builds the frontend and starts the Cloudflare Worker, including `/api/topics` and `/api/gacha`. For frontend-only development, use `npm run dev`.

### Run the integrated app locally

```bash
npm run build
npx wrangler dev
```

Wrangler serves the production frontend assets from `dist/` and runs the Worker API locally. No OpenAlex API key or application environment variables are required.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite frontend development server. |
| `npm run build` | Type-check the app and Worker configuration, then create a production build. |
| `npm test` | Run the Vitest test suite once. |
| `npm run deploy` | Build and deploy the application with Wrangler. |

## API overview

The Worker exposes two same-origin endpoints used by the frontend:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/topics?q=<query>` | Search OpenAlex topics. Queries shorter than two characters return an empty list. |
| `POST` | `/api/gacha` | Fetch candidate works for the selected topics, categories, and publication range. |

All other requests are handled by the static asset binding, with single-page application fallback enabled.

## Project structure

```text
Paper-Gacha/
├── public/               # Static assets
├── src/
│   ├── components/       # Reusable topic and paper UI
│   ├── lib/              # API client, draw algorithm, and local storage
│   ├── pages/            # Gacha, favorites, history, and settings pages
│   ├── App.tsx           # Routes and application shell
│   ├── i18n.ts           # English and Japanese translations
│   └── types.ts          # Shared domain types
├── worker/
│   ├── index.ts          # Cloudflare Worker routes and OpenAlex requests
│   └── mapper.ts         # OpenAlex work normalization
├── wrangler.jsonc        # Worker and static asset configuration
└── vite.config.ts        # Vite configuration
```

## Deployment

Authenticate Wrangler with your Cloudflare account, then run:

```bash
npx wrangler login
npm run deploy
```

The deploy script builds the frontend before publishing the Worker and its static assets. Update the Worker name and compatibility date in `wrangler.jsonc` if your deployment requires different values.

## Privacy and data

Paper Gacha can be used without an account. Guest data stays in the browser. When a user signs in, settings, language, favorites, draw history, and read-paper IDs are sent only to the same-origin Worker and stored in that user’s D1 row. The browser never connects directly to D1. Topic selections and publication-range settings are also sent to the Worker when searching or drawing; the Worker then queries OpenAlex.

Settings can export or restore a complete JSON backup. Backup files contain keywords, browsing/draw history, favorites, and other preferences in plain text, so store them in a safe place and share them only with people you trust. Importing a backup replaces all current local data.

Clearing site data resets local cached information. Signed-in data can be restored from D1 by signing in and syncing again; guest data cannot. Availability and completeness of paper metadata, abstracts, links, and open-access copies depend on OpenAlex and the underlying scholarly sources.

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a focused branch.
2. Make your changes and add or update tests where appropriate.
3. Run `npm test` and `npm run build`.
4. Open a pull request explaining the motivation and user-facing impact.

Please keep user-facing text available in both English and Japanese by updating `src/i18n.ts`.

## License

Paper Gacha is available under the [MIT License](LICENSE).

## Acknowledgments

Research metadata is provided by [OpenAlex](https://openalex.org/), an open catalog of the global research system. Paper Gacha is an independent project and is not affiliated with OpenAlex.

## Account sync (Better Auth + Cloudflare D1)

Signed-in users can synchronize settings, language, favorites, the latest 100 history entries, and read-paper IDs through the same-origin Worker. The browser never connects to D1. Local storage remains the source of offline/guest operation; a first sign-in unions entity data from both sides and uses last-write-wins timestamps for settings and language. Failed changes remain in local storage and are retried on the next online event, manual sync, or later edit.

### 1. Create and bind D1

```bash
npx wrangler d1 create paper-gacha
```

Copy the returned database ID into `d1_databases[0].database_id` in `wrangler.jsonc` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`). The binding name must remain `DB`.

### 2. Apply migrations

Apply to Wrangler's local D1 database, then to production:

```bash
npx wrangler d1 migrations apply paper-gacha --local
npx wrangler d1 migrations apply paper-gacha --remote
```

The migration creates Better Auth's `user`, `session`, `account`, and `verification` tables plus the per-user sync table. Run the local migration before `npx wrangler dev`.

### 3. Configure local development

Copy `.env.example` to `.dev.vars`. `.env.example` intentionally contains only non-secret switches and URLs. Add locally generated credentials only to the ignored `.dev.vars` file:

```dotenv
BETTER_AUTH_SECRET=<at-least-32-random-bytes>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
```

Generate a secret, for example, with `openssl rand -base64 32`. By default email verification and password reset are disabled, so missing email credentials never prevent local startup. Email/password registration and login still work locally. Do not turn either email switch on unless a sender and provider key are configured.

Build and run the integrated application at `http://localhost:8787`:

```bash
npm install
npm run build
npx wrangler dev
```

The Vite-only server does not run Worker authentication routes. Use Wrangler when testing sign-in or sync.

### 4. Configure Cloudflare secrets

Never use `VITE_` variables for these values. Set secrets on the Worker:

```bash
openssl rand -base64 32 | npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put RESEND_API_KEY
```

Set non-secret production variables (`BETTER_AUTH_URL`, `APP_ORIGIN`, and `EMAIL_FROM`) in the Cloudflare dashboard or a non-secret Wrangler `vars` block. Both URLs must be the canonical HTTPS origin, with no trailing path. To enable production mail flows, set `ENABLE_EMAIL_VERIFICATION=true` and `ENABLE_PASSWORD_RESET=true` only after `RESEND_API_KEY` and a verified `EMAIL_FROM` are present. The email transport is isolated in `worker/auth.ts`; replace `sendEmail` to use another provider.

### 5. Configure Google OAuth

In Google Cloud Console, create a Web application OAuth client. Add these authorized redirect URIs:

- Local: `http://localhost:8787/api/auth/callback/google`
- Production: `https://YOUR_DOMAIN/api/auth/callback/google`

Add `http://localhost:8787` and the production origin as authorized JavaScript origins where requested. The Google client ID and secret belong only in `.dev.vars` locally and Cloudflare secrets in production. Also keep `BETTER_AUTH_URL`/`APP_ORIGIN` aligned with the URL being tested so Better Auth validates redirects against the correct trusted origin.

### 6. Configure email delivery

For Resend, verify the sending domain/address, create an API key, store it as `RESEND_API_KEY`, and configure `EMAIL_FROM`. Verification and reset links use Better Auth's `/api/auth/*` flow and return to the configured application origin. For another service, preserve the `sendEmail(env, to, subject, html)` boundary and keep its API key in a Worker secret.

### 7. Deploy

```bash
npm test
npm run build
npm run deploy
```

Apply the remote migration before the first deployment. In production, verify the custom domain, Better Auth URL/origin, Google callback, and email sender all use that same HTTPS origin.

### Authentication and sync API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `*` | `/api/auth/*` | Better Auth handlers (Google, email/password, sessions, verification/reset, logout). |
| `GET` | `/api/sync` | Read only the authenticated user's cloud snapshot. |
| `PUT` | `/api/sync` | Store only the authenticated user's merged snapshot. |

The sync endpoints derive the user ID from the Better Auth session cookie and never accept a client-supplied user ID. Unauthenticated requests return `401`.
