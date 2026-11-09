# Violet Felt

A Vite/React craps app for phones and desktop browsers.

Open the deployed URL on a PC to play with a mouse or keyboard; no installation is required. Choose a chip, click a betting spot, and click Roll. Share a table code from the lobby to play with friends across desktop and mobile devices. Camera and microphone access require browser permission and a secure HTTPS connection.

## Run locally

Use Node.js 22, then run:

```sh
npm ci
npm run dev
```

## Deploy to Vercel

Import this repository into Vercel after the extracted source files have been pushed to GitHub. Set the root directory to the repository root, select the **Vite** framework preset, and use Node.js 22 in the project settings. The default build command is `npm run build` and the output directory is `dist`. Deploy the branch containing these files, or merge it into the production branch first.

The original ZIP is retained for reference; Vercel builds the extracted files, not the ZIP.
