# SignalForge Automatic Signals (Cloudflare Pages)

No admin panel and no login. This version separates the markets as requested:
- **Forex:** XAU/USD (Gold) only, checked on 5m, 15m, 30m, 1h and 4h candles.
- **Binary options:** CALL/PUT directional setups for multiple currency pairs, based on 5-minute reference-market candles.

## Critical OTC limitation
The binary section uses standard Twelve Data market candles. It does **not** receive Olymp Trade's proprietary OTC prices, so these signals are not guaranteed to match the prices or direction of an Olymp Trade OTC chart. Always compare the exact asset and price in Olymp Trade. Do not treat a reference-market signal as a verified OTC signal.

## One-time setup
This project includes a Cloudflare Pages Function at `functions/api/signals.js`. It requires a Twelve Data API key stored server-side as `TWELVEDATA_API_KEY`; never put the key in `index.html`.

1. Keep `index.html` in the repository root.
2. Keep `functions/api/signals.js` in exactly that folder path.
3. In Cloudflare Pages, connect the GitHub repository `signalforge`.
4. Use build command `exit 0` and output directory `/` or `.` if accepted by the dashboard.
5. In Pages Settings → Variables and Secrets, add `TWELVEDATA_API_KEY`, then redeploy.

## Notes
- API plan limits may prevent all requested candles from loading on each refresh.
- Signals appear only when EMA 9/21, MACD 12/26/9 and RSI 14 align; no signal is a valid outcome.
- This is a rule-based indicator engine, not a trained AI model. No win rate or profits are guaranteed.
- SL/TP distances are illustrative and are not broker-calibrated advice. Test on demo first.
