# Violet Felt

A Vite/React craps app for phones and desktop browsers.

Open the deployed URL on a PC to play with a mouse or keyboard; no installation is required. Choose a chip, click a betting spot, and click Roll. Share a table code from the lobby to play with friends across desktop and mobile devices. Camera and microphone access require browser permission and a secure HTTPS connection.

## Experimental camera dice reader

In **Manual** mode, choose **Scan real dice with camera**. Allow camera access, point the camera straight down at two separated white dice with dark pips on a plain dark surface, and press **Scan dice**. Check or correct both suggested values before pressing **Confirm and record roll**. You can also enter both values if scanning fails. The camera is stopped when the dialog closes; scanning is performed on the device and the camera image is not uploaded. In a room, the confirmed roll is shared as usual, not the scan image.

This is a basic image reader, not a trained vision model. It can fail or misread dice because of lighting, reflections, angle, colors, or background objects. Always verify the result. Camera access requires HTTPS (or localhost) and permission, and may be unavailable while another app or the lobby video is using the camera. Device camera behavior has not been verified on all phones and webcams.

## Run locally

Use Node.js 22, then run:

```sh
npm ci
npm run dev
```

## Deploy to Vercel

Import this repository into Vercel after the extracted source files have been pushed to GitHub. Set the root directory to the repository root, select the **Vite** framework preset, and use Node.js 22 in the project settings. The default build command is `npm run build` and the output directory is `dist`. Deploy the branch containing these files, or merge it into the production branch first.

The original ZIP is retained for reference; Vercel builds the extracted files, not the ZIP.
