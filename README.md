# NOX FUND | Live Blockchain Analytics

A read-only, mobile-first analytics dashboard for the **NOX FUND** smart contract on **BNB Smart Chain (chain ID 56)**.
Every number is read live from the deployed contract or calculated transparently from those reads. There are no placeholder or simulated values.

| | |
|---|---|
| Contract | [`0x433830E36585bdACC840E1caB419C4211bBf13f5`](https://bscscan.com/address/0x433830E36585bdACC840E1caB419C4211bBf13f5) |
| Token | USDT BEP-20 [`0x55d398326f99059fF775485246999027B3197955`](https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955) (18 decimals) |
| ABI | `abi.json` (verbatim project ABI, also at `src/lib/abi.json`) |
| Stack | React 18, TypeScript, Vite, viem, Recharts, plain CSS |

## Features
- **Live summary cards** for total historical deposits, active principal, principal returned, ROI paid, pending referral rewards, contract USDT balance, available balance, participants and usernames. Each card shows its source function, a badge (*On-chain*, *Calculated*, *Event logs*, *Estimate*, *Unavailable*) and the update time.
- **Protocol statistics** from `getConstants()`: daily ROI bps, lock period, fee, min deposit, max deposits and 7 referral levels.
- **Deposits & withdrawals** charts (24h / 7d / 30d / 90d / All) and an activity feed built from contract events, with BscScan tx links.
- **ROI analytics**: the contract-stated parameters and a formula calculator. These are explicitly *not* guarantees.
- **Contract health**: RPC status per endpoint, latest block, refresh time, balances, and BscScan buttons.
- **Wallet lookup**: analyse *any* address or NOX username read-only, or connect MetaMask / Trust Wallet (injected EIP-1193). Uses `depositCount`, `depositInfo`, `timeUntilUnlock`, `totalDeposited`, `totalWithdrawnPrincipal`, `totalWithdrawnROI`, `totalReferralEarned`, `refBalance` and `pendingROIAll`.
- **Transparency**: live consistency checks (`contractInfo()` against individual getters, available = balance − pending referrals), formulas, a money-flow reconciliation and data limits.
- Auto-refresh every 45 s plus a manual refresh. On failure, the last values are kept and labelled **STALE**, never shown as live.
- The site **never requests a transaction or signature**. Wallet connect only calls `eth_requestAccounts`.

## Data sources
- **Contract state** (lifetime totals) comes from public, key-less BSC RPCs with automatic fallback (`src/lib/config.ts`): bsc-dataseed.bnbchain.org, bsc-rpc.publicnode.com, bsc-dataseed1.defibit.io, and others. All reads in a refresh are pinned to one block number.
- **Event logs** (charts and feed) come from `bsc-rpc.publicnode.com` with chunked `eth_getLogs` (≤ 50,000 blocks per request) and batched block timestamps.

## Data limits (please read)
- **Event history window:** free public BSC nodes only keep about 58k blocks (~7 hours) of logs, so charts and the feed cover a rolling recent window. The UI shows the exact coverage. The browser caches logs in `localStorage` and extends them on later visits. Lifetime totals come from contract state and are always complete.
- **Not available from the ABI:** total active deposit count, and historical trends of active principal or TVL. These need every `Deposited` and `PrincipalWithdrawn` event since deployment, which takes an indexer (archive or paid RPC, the paid BscScan API, or a cron or backend job that stores logs).
- **Global referral withdrawn** has no getter. It is shown as an implied remainder (deposits − 5% fee − ROI − principal − balance), labelled *Estimate*.
- **WalletConnect** needs a registered project ID, so only injected wallets are supported.

## Run locally
```bash
npm ci
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve dist/ locally
npm run verify    # node script: reads every global getter live and prints formatted values
```
Optional: copy `.env.example` to `.env` and set `VITE_BSC_RPC` (comma separated). Only put **public, key-less** endpoints there. Anything prefixed `VITE_` is shipped to the browser. A keyed RPC must sit behind a server-side proxy.

## Deploy to Vercel
1. In Vercel, choose **Add New → Project**, then import this GitHub repo.
2. The settings are read from `vercel.json` (framework *Vite*, build `npm run build`, output `dist`). No environment variables are required.
3. Click **Deploy**. Every push to `main` redeploys.

## GitHub Pages (backup)
`.github/workflows/pages.yml` builds and publishes `dist/` on every push to `main`. The build uses relative asset paths, so it works under `/<repo>/`.

## Disclaimer
This is an independent, read-only analytics view. Rates are the contract’s parameters, not promises. Payouts depend on the USDT the contract holds. Nothing here is financial advice.
