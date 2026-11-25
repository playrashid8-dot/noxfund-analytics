import { formatUnits } from 'viem';
import { USDT_DECIMALS } from './config';
export const exact = (v: bigint) => formatUnits(v, USDT_DECIMALS);
export const usd = (v: bigint) =>
  Number(formatUnits(v, USDT_DECIMALS)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const timeOnly = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
