<div align="center">
  <img src="public/paper-gacha-app-icon.png" alt="Paper Gacha app icon" width="112" height="112">

  # Paper Gacha

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
| Persistence | Browser `localStorage` |
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
```

### Run the frontend

```bash
npm run dev
```

This starts Vite's development server. The frontend calls the relative endpoints `/api/topics` and `/api/gacha`, so drawing papers requires those routes to be available. Use the integrated Cloudflare preview below to run the UI and API together.

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
