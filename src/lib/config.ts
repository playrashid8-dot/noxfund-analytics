export const CHAIN_ID = 56;
export const CONTRACT = '0x433830E36585bdACC840E1caB419C4211bBf13f5' as const;
export const USDT = '0x55d398326f99059fF775485246999027B3197955' as const;
export const USDT_DECIMALS = 18;
export const BSCSCAN = 'https://bscscan.com';
export const REFRESH_MS = 45_000;

// Public, key-less BSC RPC endpoints (tried in order; first healthy one wins).
// Optional override at build time: VITE_BSC_RPC (comma separated). Never put a private key in here;
// a keyed RPC belongs behind a server-side proxy.
const envRpc = import.meta.env?.VITE_BSC_RPC as string | undefined;
export const READ_RPCS: string[] = [
  ...(envRpc ? envRpc.split(',').map((s) => s.trim()).filter(Boolean) : []),
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.bnbchain.org',
  'https://bsc-dataseed1.ninicoin.io',
  'https://1rpc.io/bnb',
  'https://bsc.blockrazor.xyz',
];

// Endpoints that serve eth_getLogs over wide ranges for free. Public BSC nodes only keep
// a few hours of log history, so event analytics cover a rolling window (see Transparency).
export const LOG_RPCS: { url: string; range: number }[] = [
  { url: 'https://bsc-rpc.publicnode.com', range: 49_999 },
];
