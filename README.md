# GreenChat

A WhatsApp-style chat app clone built as a portfolio piece. Generic green chat theme, no third-party logos or assets.

## Features

- Chat list with avatars, unread badges, last-message previews, search
- Chat view with sent/received bubbles (tails), timestamps, day separators
- Delivery ticks: sent (✓), delivered (✓✓), read (blue ✓✓)
- Typing indicator and simulated replies from demo contacts
- Emoji reactions: double-click (or long-press on touch) a message
- Multiple conversations, mobile-first layout, light and dark mode (saved in localStorage)
- Zero dependencies: plain HTML, CSS, JS, and a tiny Node server

## Run locally

Requires Node 18+.

    npm start

Then open http://localhost:3000

## Deploy to Railway

1. Push this folder to a GitHub repo (or use `railway up` from the Railway CLI).
2. In Railway, click New Project, then Deploy from GitHub repo, and pick the repo.
3. Railway detects Node and runs `npm start` automatically (from package.json).
4. Open the service, go to Settings, then Networking, and click Generate Domain.
5. The server reads the `PORT` env var that Railway sets, so no config is needed.

## Static hosting (no server)

The `public/` folder is a fully static site. Upload the contents of `public/` to any static host:

- Netlify: drag the `public` folder into app.netlify.com/drop
- GitHub Pages: copy `public/` contents into a branch or `docs/` folder and enable Pages
- Cloudflare Pages: connect the repo, leave the build command empty, set the output directory to `public`

Everything runs client-side, so no backend is needed.

## Project layout

    greenchat/
      package.json      start script: node server.js
      server.js         zero-dep static server with SPA fallback
      public/
        index.html      markup for list and chat screens
        styles.css      green theme, light and dark variables, bubble tails
        app.js          state, rendering, demo bot logic

## Customize

- Contacts and scripted replies live at the top of `public/app.js` (CONTACTS, BOT_REPLIES, SEED_MESSAGES).
- Colors are CSS variables at the top of `public/styles.css`.
