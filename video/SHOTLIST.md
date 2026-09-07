# Shot list — what to record

All clips: **1920×1080, 30 fps, MP4 (H.264)**, browser at 100% zoom, dark mode, no bookmarks bar, no notifications.
Use QuickTime (File → New Screen Recording, select the browser window) or OBS. Name files exactly as below and drop
them into `video/public/clips/`. The film picks them up automatically; unrecorded slots show a placeholder.

Site: https://attestcredit.vercel.app · demo wallet `0x3C343AD077983371b29fee386bdBC8a92E934C51`

| File | Length | What to capture |
|---|---|---|
| `01-etherscan.mp4` | 8 s | https://sepolia.etherscan.io/address/0x3C343AD077983371b29fee386bdBC8a92E934C51 → Transactions tab. Scroll slowly past the Aave Pool `borrow` / `repay` rows. |
| `02-import.mp4` | 26 s+ | `/app` with the demo wallet connected on Creditcoin Testnet. Click **Import Aave history**. Keep recording through: found → waiting for attestation → proof built → verified, until the last row shows the Creditcoin tx. (Record longer than 26 s; the film uses the first 26 s. If you want the verified state on screen, trim the start of the clip instead, or import a *fresh* wallet: run `pnpm --filter @attestcredit/worker cli seed` with a new funded key first so nothing is "already verified".) |
| `03-score.mp4` | 12 s | Same page, after import: the gauge, the breakdown ("Why this score"), then click **Refresh passport** and hover the passport image. |
| `04-lookup.mp4` | 10 s | `/lookup/0x3C343AD077983371b29fee386bdBC8a92E934C51`. Slow scroll from the score to the facts table with the Creditcoin tx links. |
| `05-lender.mp4` | 14 s | `/app/lender`. Show the terms table with "you" on Silver, borrow 0.5 TUSD against 1 CTC, then repay (approve first). End on the "Native repayments recorded: 2 · score 540" line. |
| `06-docs.mp4` | 8 s | `/docs`. Scroll the Attestcoin touchpoint table, stop on the measured gas table. |

Optional B-roll if you have time: the Blockscout page of the batch tx
https://creditcoin-testnet.blockscout.com/tx/0x874c8e889f653be491ac73c0a98398eda23b4ae76da99e061f9e0344d0a8b929
(7 `TransactionVerified` events from the precompile).

## Voice

Record each scene from `SCRIPT.md` as `public/vo/NN-name.mp3` (or one file `public/vo/full.mp3`). Tell me which and I
wire it in and time the scenes to it.

## Render

```bash
pnpm --filter @attestcredit/video studio   # preview, scrub every scene
pnpm --filter @attestcredit/video render   # → video/out/attestcredit-pitch.mp4
```
