# SignalForge Automatic Signals (Cloudflare Pages)

This version has **no admin panel, no login, and no manual signal-entry tools**. It calculates technical setups from 5-minute Forex candles using EMA 9/21, MACD 12/26/9, and RSI 14. Binary-style CALL/PUT rows are directional interpretations of the same Forex setup, not signals from a binary-options broker.

## Important: one-time setup is required
A static upload alone cannot securely fetch live market data or run server-side calculations. This project includes a Cloudflare Pages Function at `functions/api/signals.js`. It needs a Twelve Data API key stored as a server-side environment variable. The key is **not** placed in the website HTML.

## Deploy using free services
1. Create a free account at https://github.com/ and a new repository.
2. Extract this ZIP on a computer, or upload the files/folders to the repository using GitHub's mobile website. Keep `index.html` in the repository root and keep `functions/api/signals.js` in exactly that folder path.
3. Get a Twelve Data API key at https://twelvedata.com/ (provider plans and limits can change).
4. Open https://dash.cloudflare.com/ → Workers & Pages → Create → Pages → Connect to Git.
5. Select the repository. For a plain HTML Pages project, use build command `exit 0` and build output directory `/` or leave build settings blank if the dashboard permits it. Deploy.
6. In the Pages project, open Settings → Variables and Secrets (or Environment variables) and add `TWELVEDATA_API_KEY` with your API key. Save and trigger a new deployment.
7. Open the provided `*.pages.dev` address. The site checks data at startup and refreshes about every 15 minutes.

## Behavior and limitations
- If no valid API key/data is available, the site shows an error rather than fake signals.
- The function requests four symbols; provider request limits may mean not all data can be returned on every refresh. Do not poll more often than needed.
- Only aligned setups are shown. No setup can mean no current signals.
- This is an indicator-rule system, not a trained AI model. An AI model can be added later, but does not guarantee better performance.
- The site does not yet store immutable signal history or verify future outcomes, so it does not claim a historical win rate.
- The SL/TP levels are simple illustrative distances from the current price, not broker-calibrated recommendations. Test on a demo account first.
- Forex and binary options involve significant risk. No profits or accuracy percentage are guaranteed.
