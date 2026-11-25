# NOX FUND | Live Blockchain Analytics

A minimal, read-only dashboard that shows **six live on-chain values** from the NOX FUND contract on **BNB Smart Chain (chain ID 56)**.

| Card | Source |
|---|---|
| Total Deposited | `globalDeposited()` |
| Principal Returned | `globalWithdrawnPrincipal()` |
| Total ROI Paid | `globalWithdrawnROI()` |
| Contract USDT Balance | `USDT.balanceOf(contract)` |
| Available Balance | `contractInfo().availableBalance_` |
| Pending Referral Rewards | `totalPendingReferrals()` |

- Contract: [`0x433830E36585bdACC840E1caB419C4211bBf13f5`](https://bscscan.com/address/0x433830E36585bdACC840E1caB419C4211bBf13f5)
- USDT (BEP-20, 18 decimals): [`0x55d398326f99059fF775485246999027B3197955`](https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955)
- ABI: `abi.json` (verbatim project ABI, also at `src/lib/abi.json`)
- Stack: React 18, TypeScript, Vite, viem, plain CSS

## How it works
- All six values are read on every refresh, **pinned to the same block**, and formatted with USDT's 18 decimals. There are no hardcoded amounts. Hover a value to see full precision.
- Public, key-less BSC RPCs are tried in order with automatic fallback, and the chain ID is checked to be 56 (`src/lib/config.ts`).
- The header shows LIVE / STALE / ERROR, the latest block and the last update time. The page auto-refreshes every **40 s**, and there is a manual refresh button.
- If a refresh fails, the last values stay on screen labelled **STALE**. If nothing has loaded yet, an **ERROR** state is shown. Old data is never labelled live.
- Read-only: no wallet connection and no transactions.

## Run locally
```bash
npm ci
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve dist/
npm run verify    # node script: reads the contract live and prints formatted values
```
Optional: set `VITE_BSC_RPC` (comma separated, **public endpoints only**; anything `VITE_*` ships to the browser). See `.env.example`.

## Deploy
- **Vercel:** imported from this repo. `vercel.json` sets framework Vite, `npm run build`, output `dist`. Every push to `main` deploys to production.
- **GitHub Pages (backup):** `.github/workflows/pages.yml` publishes `dist/` on every push to `main`.

## Disclaimer
This is an independent, read-only view of public contract state. Nothing here is financial advice.
