# Paper Gacha / 論文ガチャ

A bilingual, local-first paper discovery app powered by OpenAlex. Pick expert, related, and deliberately different topics; Paper Gacha draws new papers without repeating anything previously shown in the browser.

## Development

```bash
npm install
npm start
```

`npm start` builds the frontend and starts the Cloudflare Worker, including `/api/topics` and `/api/gacha`. For frontend-only development, use `npm run dev`.

## Production

```bash
npm run deploy
```

No API key is required. Settings, favorites, draw IDs, and history are stored in `localStorage` and never leave the device.
