import { createPublicClient, http, erc20Abi, type Abi, type PublicClient } from 'viem';
import { bsc } from 'viem/chains';
import abiJson from './abi.json';
import { CONTRACT, USDT, READ_RPCS, CHAIN_ID } from './config';

const abi = abiJson as Abi;
const clients = new Map<string, PublicClient>();
const client = (url: string) => {
  let c = clients.get(url);
  if (!c) { c = createPublicClient({ chain: bsc, transport: http(url, { timeout: 10_000, retryCount: 1 }) }) as PublicClient; clients.set(url, c); }
  return c;
};
let preferred = 0;

export const shortErr = (e: unknown) => String((e as any)?.shortMessage || (e as any)?.message || e).split('\n')[0].slice(0, 140);

export type Snapshot = {
  blockNumber: bigint; blockTime: number; rpc: string;
  globalDeposited: bigint; globalWithdrawnPrincipal: bigint; globalWithdrawnROI: bigint;
  usdtBalance: bigint; availableBalance: bigint; totalPendingReferrals: bigint;
};

/** Reads all six values pinned to one block, falling back across public RPCs. */
export async function fetchSnapshot(): Promise<Snapshot> {
  let lastErr: unknown;
  for (let k = 0; k < READ_RPCS.length; k++) {
    const i = (preferred + k) % READ_RPCS.length;
    const url = READ_RPCS[i];
    try {
      const c = client(url);
      const chainId = await c.getChainId();
      if (chainId !== CHAIN_ID) throw new Error(`Wrong chain ${chainId}`);
      const blockNumber = await c.getBlockNumber();
      const read = (functionName: string) => c.readContract({ address: CONTRACT, abi, functionName, blockNumber }) as Promise<any>;
      const [block, gd, gwp, gwr, bal, info, tpr] = await Promise.all([
        c.getBlock({ blockNumber }),
        read('globalDeposited'), read('globalWithdrawnPrincipal'), read('globalWithdrawnROI'),
        c.readContract({ address: USDT, abi: erc20Abi, functionName: 'balanceOf', args: [CONTRACT], blockNumber }),
        read('contractInfo'), read('totalPendingReferrals'),
      ]);
      preferred = i;
      return {
        blockNumber, blockTime: Number(block.timestamp), rpc: url,
        globalDeposited: gd, globalWithdrawnPrincipal: gwp, globalWithdrawnROI: gwr,
        usdtBalance: bal, availableBalance: info[1], totalPendingReferrals: tpr,
      };
    } catch (e) { lastErr = e; }
  }
  throw new Error('All RPC endpoints failed: ' + shortErr(lastErr));
}
