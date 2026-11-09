# Violet Felt

A Vite/React craps app for phones and desktop browsers.

Open the deployed URL on a PC to play with a mouse or keyboard; no installation is required. Choose a chip, click a betting spot, and click Roll. Share a table code from the lobby to play with friends across desktop and mobile devices. Camera and microphone access require browser permission and a secure HTTPS connection.

## Experimental live camera dice reader

In **Manual** mode, choose **Start live dice camera**, click **Enable camera**, and allow access. Point the camera straight down at a dark, plain landing area. After you throw two separated white dice with dark pips into view, the reader watches for motion and suggests a result once the dice appear stable. Check or correct both values, then press **Confirm and record roll**. The camera stays open for the next throw. Use **Hide camera picture** after aiming it to keep the preview out of the way; use **Show camera picture** to bring it back. The reader waits for fresh movement before suggesting another result; it pauses while the table is busy or another player is shooting. You can also enter both dice manually. Use the X or **Stop dice camera** to stop the camera.

Frames are analyzed locally, not recorded or uploaded. In a room, only the confirmed roll is shared as usual. The reader is experimental, not a trained vision model: lighting, reflections, angle, background and color can cause missed or incorrect readings. Always verify the result. Camera access requires HTTPS and browser permission; open the site directly in a new tab if embedded preview permissions block the camera. Close other apps or lobby video if they occupy the camera. Real webcam and phone performance must be tested with your setup.

## Run locally

Use Node.js 22, then run:

```sh
npm ci
npm run dev
```

## Deploy to Vercel

Import this repository into Vercel after the extracted source files have been pushed to GitHub. Set the root directory to the repository root, select the **Vite** framework preset, and use Node.js 22 in the project settings. The default build command is `npm run build` and the output directory is `dist`. Deploy the branch containing these files, or merge it into the production branch first.

The original ZIP is retained for reference; Vercel builds the extracted files, not the ZIP.
