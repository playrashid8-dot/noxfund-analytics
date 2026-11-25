import { formatUnits } from 'viem';
import { USDT_DECIMALS } from './config';
export const toNum = (v: bigint | string) => Number(formatUnits(BigInt(v), USDT_DECIMALS));
export const exact = (v: bigint | string) => formatUnits(BigInt(v), USDT_DECIMALS);
export function usd(v: bigint | string | number, dp = 2) {
  const n = typeof v === 'number' ? v : toNum(v);
  return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
export function compact(n: number) {
  return n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
}
export const short = (a: string) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '');
export function dt(sec: number) {
  if (!sec) return '—';
  return new Date(sec * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function timeOnly(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
export function ago(sec: number, now = Date.now() / 1000) {
  const d = Math.max(0, now - sec);
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ${Math.floor((d % 3600) / 60)}m ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
export function duration(sec: number) {
  if (sec <= 0) return 'Unlocked';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}
export const bps = (b: bigint) => (Number(b) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
