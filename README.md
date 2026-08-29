# Paper Gacha

Paper Gacha is a local Windows desktop app for discovering research papers when you choose to explore. It has no server, no account, and no GitHub Actions or GitHub Pages dependency.

## Desktop app (Windows 11)

Install Python 3.13 (64-bit), clone this repository, then run:

```powershell
.\run.cmd
```

The first launch creates a local virtual environment and installs dependencies. Later launches open the app immediately. The embedding model is downloaded the first time you draw papers.

The app stores settings, draw history, and favorites only on your computer. You can export or import that data as JSON from the Settings tab.

## How it works

Configure core themes, related themes, serendipity fields, result counts, and a lookback period in Settings. A draw retrieves candidates from arXiv, OpenAlex, and Semantic Scholar, then presents results one card at a time in this order:

1. Core
2. Related
3. Serendipity

Drawn papers are excluded from future draws. Browse previous draws in History and save papers in Favorites.

## Bluesky posting from the app

Enable **Bluesky posting** in Settings, enter your handle and an app password, then finish revealing a draw. Check the individual papers you want to publish and select **Post selected papers to Bluesky**. The app password is used only for the running session and is never saved or included in data exports.

## Optional Bluesky posting CLI

The legacy command-line script remains available only if you deliberately want to post a selected daily collection.

```powershell
$env:BLUESKY_HANDLE = 'your-bot.bsky.social'
$env:BLUESKY_APP_PASSWORD = 'your-app-password'
python paper_gacha.py
```

Set `PAPER_GACHA_DRY_RUN=true` to preview the post text without sending anything. The script keeps posted paper IDs in `data/posted_papers.json` to avoid reposting them.

## Optional API key

Semantic Scholar may return HTTP 429 when its shared unauthenticated rate limit is busy. If you have an API key, set `SEMANTIC_SCHOLAR_API_KEY` before launching the app or command-line script. arXiv and OpenAlex results remain available if Semantic Scholar is temporarily rate-limited.
