export const CHAIN_ID = 56;
export const CONTRACT = '0x433830E36585bdACC840E1caB419C4211bBf13f5' as const;
export const USDT = '0x55d398326f99059fF775485246999027B3197955' as const;
export const USDT_DECIMALS = 18;
export const BSCSCAN = 'https://bscscan.com';
export const REFRESH_MS = 40_000;

// Public, key-less BSC RPC endpoints, tried in order with automatic fallback.
// Optional build-time override: VITE_BSC_RPC (comma separated, public endpoints only).
const envRpc = import.meta.env?.VITE_BSC_RPC as string | undefined;
export const READ_RPCS: string[] = [
  ...(envRpc ? envRpc.split(',').map((s) => s.trim()).filter(Boolean) : []),
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.bnbchain.org',
  'https://bsc-dataseed1.ninicoin.io',
  'https://1rpc.io/bnb',
];
