import { createPublicClient, http, erc20Abi, decodeEventLog, type Abi, type PublicClient, type Log } from 'viem';
import { bsc } from 'viem/chains';
import abiJson from './abi.json';
import { CONTRACT, USDT, READ_RPCS, LOG_RPCS } from './config';

export const abi = abiJson as Abi;

const clients = new Map<string, PublicClient>();
function client(url: string): PublicClient {
  let c = clients.get(url);
  if (!c) {
    c = createPublicClient({ chain: bsc, transport: http(url, { timeout: 12_000, retryCount: 1, batch: { batchSize: 40 } }) }) as PublicClient;
    clients.set(url, c);
  }
  return c;
}

export type RpcStatus = { url: string; ok: boolean; error?: string; at: number };
export const rpcLog: RpcStatus[] = [];
let preferred = 0;

/** Run fn against the RPC list with automatic fallback. Returns result + the RPC used. */
export async function withRpc<T>(fn: (c: PublicClient) => Promise<T>, urls = READ_RPCS): Promise<{ value: T; rpc: string }> {
  let lastErr: unknown;
  for (let k = 0; k < urls.length; k++) {
    const i = (preferred + k) % urls.length;
    const url = urls[i];
    try {
      const value = await fn(client(url));
      if (urls === READ_RPCS) preferred = i;
      pushStatus({ url, ok: true, at: Date.now() });
      return { value, rpc: url };
    } catch (e) {
      lastErr = e;
      pushStatus({ url, ok: false, error: shortErr(e), at: Date.now() });
    }
  }
  throw new Error('All RPC endpoints failed: ' + shortErr(lastErr));
}
function pushStatus(s: RpcStatus) {
  const i = rpcLog.findIndex((r) => r.url === s.url);
  if (i >= 0) rpcLog[i] = s; else rpcLog.push(s);
}
export function shortErr(e: unknown): string {
  const m = (e as any)?.shortMessage || (e as any)?.message || String(e);
  return String(m).split('\n')[0].slice(0, 160);
}

export type Constants = {
  dailyROIBps: bigint; lockSeconds: bigint; feeBps: bigint; feeRecipient: string; maxROIDays: bigint;
  minDeposit: bigint; maxDepositsPerUser: bigint; usdtToken: string; refBps: bigint[];
};

export type GlobalData = {
  blockNumber: bigint; blockTime: number; rpc: string; fetchedAt: number;
  // contractInfo() tuple
  info: { contractBalance: bigint; availableBalance: bigint; totalPendingReferrals: bigint; globalDeposited: bigint; globalWithdrawnROI: bigint; globalWithdrawnPrincipal: bigint; totalParticipants: bigint };
  // individual getters
  globalDeposited: bigint; globalWithdrawnPrincipal: bigint; globalWithdrawnROI: bigint; totalParticipants: bigint; totalPendingReferrals: bigint; totalUsernames: bigint;
  usdtBalance: bigint; constants: Constants;
  checks: { name: string; ok: boolean; detail: string }[];
};

export async function fetchGlobal(): Promise<GlobalData> {
  const { value, rpc } = await withRpc(async (c) => {
    const blockNumber = await c.getBlockNumber();
    const opts = { blockNumber } as const;
    const r = (functionName: string) => c.readContract({ address: CONTRACT, abi, functionName, ...opts }) as Promise<any>;
    const [block, ci, gd, gwp, gwr, tp, tpr, tu, gc, bal] = await Promise.all([
      c.getBlock({ blockNumber }),
      r('contractInfo'), r('globalDeposited'), r('globalWithdrawnPrincipal'), r('globalWithdrawnROI'),
      r('totalParticipants'), r('totalPendingReferrals'), r('totalUsernames'), r('getConstants'),
      c.readContract({ address: USDT, abi: erc20Abi, functionName: 'balanceOf', args: [CONTRACT], ...opts }),
    ]);
    return { blockNumber, block, ci, gd, gwp, gwr, tp, tpr, tu, gc, bal };
  });
  const { blockNumber, block, ci, gd, gwp, gwr, tp, tpr, tu, gc, bal } = value;
  const info = { contractBalance: ci[0], availableBalance: ci[1], totalPendingReferrals: ci[2], globalDeposited: ci[3], globalWithdrawnROI: ci[4], globalWithdrawnPrincipal: ci[5], totalParticipants: ci[6] };
  const constants: Constants = {
    dailyROIBps: gc[0], lockSeconds: gc[1], feeBps: gc[2], feeRecipient: gc[3], maxROIDays: gc[4], minDeposit: gc[5],
    maxDepositsPerUser: gc[6], usdtToken: gc[7], refBps: [gc[8], gc[9], gc[10], gc[11], gc[12], gc[13], gc[14]],
  };
  const eq = (a: bigint, b: bigint) => a === b;
  const checks = [
    { name: 'contractInfo.contractBalance = USDT.balanceOf(contract)', ok: eq(info.contractBalance, bal), detail: '' },
    { name: 'contractInfo.globalDeposited = globalDeposited()', ok: eq(info.globalDeposited, gd), detail: '' },
    { name: 'contractInfo.globalWithdrawnPrincipal = globalWithdrawnPrincipal()', ok: eq(info.globalWithdrawnPrincipal, gwp), detail: '' },
    { name: 'contractInfo.globalWithdrawnROI = globalWithdrawnROI()', ok: eq(info.globalWithdrawnROI, gwr), detail: '' },
    { name: 'contractInfo.totalParticipants = totalParticipants()', ok: eq(info.totalParticipants, tp), detail: '' },
    { name: 'contractInfo.totalPendingReferrals = totalPendingReferrals()', ok: eq(info.totalPendingReferrals, tpr), detail: '' },
    { name: 'availableBalance = contractBalance − totalPendingReferrals', ok: eq(info.availableBalance, (bal > tpr ? bal - tpr : 0n)), detail: '' },
    { name: 'getConstants().usdtToken = configured USDT address', ok: constants.usdtToken.toLowerCase() === USDT.toLowerCase(), detail: '' },
  ];
  return {
    blockNumber, blockTime: Number(block.timestamp), rpc, fetchedAt: Date.now(), info,
    globalDeposited: gd, globalWithdrawnPrincipal: gwp, globalWithdrawnROI: gwr, totalParticipants: tp, totalPendingReferrals: tpr, totalUsernames: tu,
    usdtBalance: bal, constants, checks,
  };
}

/* ------------------------------- Events ------------------------------- */

export type EventName = 'Deposited' | 'ROIWithdrawn' | 'PrincipalWithdrawn' | 'ReferralPaid' | 'ReferralWithdrawn' | 'UsernameClaimed' | 'FeeSent';
export type ChainEvent = {
  name: EventName; block: number; time: number; tx: string; logIndex: number;
  user: string; amount: string; // amount in wei as string (0 when n/a)
  extra: Record<string, string>;
};
export type EventStore = { fromBlock: number; toBlock: number; events: ChainEvent[]; rpc?: string; truncatedStart: boolean; updatedAt: number };

const STORE_KEY = 'noxfund.events.v1.' + CONTRACT.toLowerCase();

export function loadStore(): EventStore | null {
  try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveStore(s: EventStore) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* quota: ignore */ }
}

/** Binary-search the oldest block whose logs the public node still serves (USDT emits logs every block). */
async function oldestLogBlock(c: PublicClient, head: number): Promise<number> {
  const has = async (b: number) => {
    try { const l = await c.getLogs({ address: USDT, fromBlock: BigInt(b), toBlock: BigInt(b + 2) }); return l.length > 0; } catch { return false; }
  };
  let hi = head - 1200; // ~9 min back: assume present
  if (!(await has(hi))) return head - 1200;
  let lo = Math.max(0, head - 3_000_000);
  if (await has(lo)) return lo;
  while (hi - lo > 200) { const m = Math.floor((lo + hi) / 2); if (await has(m)) hi = m; else lo = m; }
  return hi + 50; // small safety margin
}

function decode(l: Log): Omit<ChainEvent, 'time'> | null {
  try {
    const d = decodeEventLog({ abi, topics: l.topics as any, data: l.data }) as any;
    const a = d.args as Record<string, any>;
    const base = { name: d.eventName as EventName, block: Number(l.blockNumber), tx: l.transactionHash!, logIndex: Number(l.logIndex) };
    switch (d.eventName) {
      case 'Deposited': return { ...base, user: a.user, amount: a.amount.toString(), extra: { depositIndex: a.depositIndex.toString(), ref: a.ref } };
      case 'ROIWithdrawn': return { ...base, user: a.user, amount: a.amount.toString(), extra: { depositIndex: a.depositIndex.toString(), daysClaimed: a.daysClaimed.toString() } };
      case 'PrincipalWithdrawn': return { ...base, user: a.user, amount: a.principal.toString(), extra: { depositIndex: a.depositIndex.toString(), roi: a.roi.toString() } };
      case 'ReferralPaid': return { ...base, user: a.recipient, amount: a.amount.toString(), extra: { depositor: a.depositor, level: a.level.toString() } };
      case 'ReferralWithdrawn': return { ...base, user: a.recipient, amount: a.amount.toString(), extra: {} };
      case 'UsernameClaimed': return { ...base, user: a.user, amount: '0', extra: { username: a.username } };
      case 'FeeSent': return { ...base, user: a.recipient, amount: a.amount.toString(), extra: {} };
    }
  } catch { /* not in ABI */ }
  return null;
}

/** Incrementally sync contract event logs into localStorage. */
export async function syncEvents(head: bigint, onProgress?: (p: string) => void): Promise<EventStore> {
  let lastErr: unknown;
  for (const { url, range } of LOG_RPCS) {
    try {
      const c = client(url);
      const h = Number(head);
      let store = loadStore();
      const oldest = await oldestLogBlock(c, h);
      if (!store || store.toBlock + 1 < oldest) {
        store = { fromBlock: oldest, toBlock: oldest - 1, events: [], truncatedStart: true, updatedAt: 0 };
      }
      let from = store.toBlock + 1;
      const fresh: Omit<ChainEvent, 'time'>[] = [];
      while (from <= h) {
        const to = Math.min(h, from + range);
        onProgress?.(`Fetching logs ${from.toLocaleString()} → ${to.toLocaleString()}`);
        let logs: Log[] | null = null; let err: unknown;
        for (let attempt = 0; attempt < 3 && !logs; attempt++) {
          try { logs = await c.getLogs({ address: CONTRACT, fromBlock: BigInt(from), toBlock: BigInt(to) }); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 800)); }
        }
        if (!logs) throw err;
        for (const l of logs) { const d = decode(l); if (d) fresh.push(d); }
        from = to + 1;
      }
      // block timestamps (batched JSON-RPC)
      const blocks = [...new Set(fresh.map((e) => e.block))];
      const ts = new Map<number, number>();
      for (let i = 0; i < blocks.length; i += 40) {
        onProgress?.(`Fetching block timestamps ${i}/${blocks.length}`);
        const part = blocks.slice(i, i + 40);
        const res = await Promise.all(part.map((b) => c.getBlock({ blockNumber: BigInt(b) })));
        res.forEach((b) => ts.set(Number(b.number), Number(b.timestamp)));
      }
      const known = new Set(store.events.map((e) => e.tx + ':' + e.logIndex));
      const add = fresh.filter((e) => !known.has(e.tx + ':' + e.logIndex)).map((e) => ({ ...e, time: ts.get(e.block)! }));
      const next: EventStore = { ...store, toBlock: h, events: [...store.events, ...add], rpc: url, updatedAt: Date.now() };
      next.events.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
      saveStore(next);
      return next;
    } catch (e) { lastErr = e; }
  }
  throw new Error('Event log fetch failed: ' + shortErr(lastErr));
}

/* ------------------------------- Wallet ------------------------------- */

export type DepositRow = {
  index: number; principal: bigint; startTime: number; lastClaimTime: number; maturesAt: number; totalROIDaysClaimed: number;
  remainingROIDays: number; daysElapsed: number; daysUnclaimed: number; pendingROI: bigint; isMatured: boolean; isWithdrawn: boolean; isROIMaxed: boolean;
  timeUntilUnlock: number;
};
export type WalletData = {
  address: string; blockNumber: bigint; fetchedAt: number; username: string; referrer: string;
  depositCount: number; totalDeposited: bigint; totalWithdrawnPrincipal: bigint; totalWithdrawnROI: bigint; totalReferralEarned: bigint;
  refBalance: bigint; pendingROIAll: bigint; deposits: DepositRow[];
};

export async function fetchWallet(address: `0x${string}`): Promise<WalletData> {
  const { value } = await withRpc(async (c) => {
    const blockNumber = await c.getBlockNumber();
    const base = { address: CONTRACT, abi, blockNumber } as const;
    const r = (functionName: string, args: any[]) => c.readContract({ ...base, functionName, args }) as Promise<any>;
    const [cnt, td, twp, twr, tre, rb, pra, un, refr] = await Promise.all([
      r('depositCount', [address]), r('totalDeposited', [address]), r('totalWithdrawnPrincipal', [address]), r('totalWithdrawnROI', [address]),
      r('totalReferralEarned', [address]), r('refBalance', [address]), r('pendingROIAll', [address]), r('addressToUsername', [address]), r('referrer', [address]),
    ]);
    const n = Number(cnt);
    const deposits: DepositRow[] = [];
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < idx.length; i += 25) {
      const part = idx.slice(i, i + 25);
      const res = await Promise.all(part.map(async (k) => {
        const [d, tu] = await Promise.all([r('depositInfo', [address, BigInt(k)]), r('timeUntilUnlock', [address, BigInt(k)])]);
        return { k, d, tu };
      }));
      for (const { k, d, tu } of res) deposits.push({
        index: k, principal: d[0], startTime: Number(d[1]), lastClaimTime: Number(d[2]), maturesAt: Number(d[3]), totalROIDaysClaimed: Number(d[4]),
        remainingROIDays: Number(d[5]), daysElapsed: Number(d[6]), daysUnclaimed: Number(d[7]), pendingROI: d[8], isMatured: d[9], isWithdrawn: d[10], isROIMaxed: d[11],
        timeUntilUnlock: Number(tu),
      });
    }
    return { blockNumber, cnt: n, td, twp, twr, tre, rb, pra, un, refr, deposits };
  });
  return {
    address, blockNumber: value.blockNumber, fetchedAt: Date.now(), username: value.un, referrer: value.refr, depositCount: value.cnt,
    totalDeposited: value.td, totalWithdrawnPrincipal: value.twp, totalWithdrawnROI: value.twr, totalReferralEarned: value.tre,
    refBalance: value.rb, pendingROIAll: value.pra, deposits: value.deposits,
  };
}

export async function resolveUsername(name: string): Promise<string> {
  const { value } = await withRpc((c) => c.readContract({ address: CONTRACT, abi, functionName: 'usernameToAddress', args: [name] }) as Promise<string>);
  return value;
}
