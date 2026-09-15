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

Paper Gacha has no account system. Its settings, language preference, favorites, draw history, and exclusion list are stored locally in the browser and are not sent to an application database. Topic selections and publication-range settings are sent to the same-origin Worker when searching or drawing; the Worker then queries OpenAlex.

Settings can export or restore a complete JSON backup. Backup files contain keywords, browsing/draw history, favorites, and other preferences in plain text, so store them in a safe place and share them only with people you trust. Importing a backup replaces all current local data.

Clearing site data resets all locally saved information. Because data is device- and browser-specific, it does not automatically sync across devices. Availability and completeness of paper metadata, abstracts, links, and open-access copies depend on OpenAlex and the underlying scholarly sources.

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

## Account sync with Supabase

The app shows an account screen on first load. Users can sign in to sync, or choose **Continue without an account** to retain the original local-only workflow. When signed in, browser storage remains the offline cache. Settings and language use last-write-wins timestamps; favorites, history, and read IDs merge by stable ID with deletion tombstones. History is capped at the newest 100 entries, rapid edits are debounced, and failed changes retry after the browser comes online.

### 1. Create the database schema

1. Create a Supabase project, then open **SQL Editor → New query**.
2. Paste and run [`supabase/migrations/20260915000000_create_user_sync_data.sql`](supabase/migrations/20260915000000_create_user_sync_data.sql). With the CLI, use `supabase link --project-ref <project-ref>` followed by `supabase db push` instead.
3. In **Database → Tables → user_sync_data**, confirm that RLS is enabled. In **Authentication → Policies**, confirm the three policies for `SELECT`, `INSERT`, and `UPDATE` exist.
4. Do not add a permissive anonymous policy. The table intentionally requires an authenticated JWT, defaults `user_id` to `auth.uid()`, and rejects a different user ID with both its check constraint and RLS policy.

You can verify isolation by creating two test users: sign in as user A and create sync data, then sign in as user B in a private window. User B must neither see nor overwrite user A's row.

### 2. Configure email authentication

1. Open **Authentication → Providers → Email** and enable Email/Password.
2. Decide whether **Confirm email** is required. When enabled, new users must follow the confirmation email before their first password login; customize the confirmation and recovery templates under **Authentication → Email Templates** if needed.
3. Open **Authentication → URL Configuration**. Set **Site URL** to the deployed app origin (for example `https://paper-gacha.example`) and add the exact settings callbacks to **Redirect URLs**, such as `https://paper-gacha.example/settings` and `http://localhost:5173/settings`.
4. Configure a production SMTP provider under **Project Settings → Authentication → SMTP** before production use. Supabase's built-in mail service is intended for limited testing and may be rate-limited.

### 3. Configure Google OAuth

1. In Google Cloud Console, create or select a project, configure the OAuth consent screen, and create a **Web application** OAuth 2.0 client.
2. In Supabase **Authentication → Providers → Google**, copy the callback URL shown by Supabase. It normally has the form `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Add that Supabase callback—not the Paper Gacha URL—to Google's **Authorized redirect URIs**. Add the deployed Paper Gacha origin to **Authorized JavaScript origins** if required by the Google configuration.
4. Enter the Google client ID and client secret in the Supabase Google provider and enable it. The Google client secret stays only in Supabase and must never be placed in this repository or a `VITE_` variable.
5. Keep the Paper Gacha `/settings` URLs from the email setup in Supabase's redirect allow list; Supabase redirects the completed OAuth session there.

### 4. Configure frontend environment variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Set `VITE_SUPABASE_URL` from **Project Settings → API → Project URL** and `VITE_SUPABASE_ANON_KEY` to the public anon/publishable browser key from the same page. Restart Vite after changing them. For production, add both variables to the environment that runs `npm run build`; Vite embeds them at build time. Setting them only as runtime Worker secrets is not sufficient for the already-built frontend.

Never use `SUPABASE_SERVICE_ROLE_KEY` in the browser, Cloudflare Worker, `.env.example`, or committed files. Paper Gacha does not require it. The existing Worker remains limited to the research-data APIs; authentication and sync call Supabase directly with the signed-in user's JWT and are protected by RLS.

### 5. Production smoke test

After deployment, test email registration/confirmation, email login, reset-email delivery, Google login, logout, offline edits, and reconciliation between two browsers. Also confirm that the browser network requests use the anon key plus the user's JWT and that an unauthenticated request to `/rest/v1/user_sync_data` cannot read rows.
