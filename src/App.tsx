import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSnapshot, shortErr, type Snapshot } from './lib/chain';
import { CONTRACT, BSCSCAN, REFRESH_MS } from './lib/config';
import { usd, exact, timeOnly } from './lib/format';

type Status = 'loading' | 'live' | 'stale' | 'error';
type Key = 'globalDeposited' | 'globalWithdrawnPrincipal' | 'globalWithdrawnROI' | 'usdtBalance' | 'availableBalance' | 'totalPendingReferrals';

const CARDS: { key: Key; title: string; src: string; gold?: boolean }[] = [
  { key: 'globalDeposited', title: 'Total Deposited', src: 'globalDeposited()' },
  { key: 'globalWithdrawnPrincipal', title: 'Principal Returned', src: 'globalWithdrawnPrincipal()' },
  { key: 'globalWithdrawnROI', title: 'Total ROI Paid', src: 'globalWithdrawnROI()', gold: true },
  { key: 'usdtBalance', title: 'Contract USDT Balance', src: 'USDT.balanceOf(contract)' },
  { key: 'availableBalance', title: 'Available Balance', src: 'contractInfo().availableBalance_' },
  { key: 'totalPendingReferrals', title: 'Pending Referral Rewards', src: 'totalPendingReferrals()', gold: true },
];

export default function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const hasData = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const s = await fetchSnapshot();
      setSnap(s); setLastOk(Date.now()); setStatus('live'); setError(null); hasData.current = true;
    } catch (e) {
      setError((navigator.onLine ? '' : 'Offline. ') + shortErr(e));
      setStatus(hasData.current ? 'stale' : 'error');
    } finally { busyRef.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, REFRESH_MS);
    const off = () => { if (hasData.current) setStatus('stale'); setError('Network offline'); };
    window.addEventListener('online', refresh); window.addEventListener('offline', off);
    return () => { clearInterval(t); window.removeEventListener('online', refresh); window.removeEventListener('offline', off); };
  }, [refresh]);

  // Never present data older than ~2 refresh cycles as live.
  useEffect(() => {
    const t = setInterval(() => { if (lastOk && Date.now() - lastOk > REFRESH_MS * 2.2) setStatus((s) => (s === 'live' ? 'stale' : s)); }, 5000);
    return () => clearInterval(t);
  }, [lastOk]);

  const label = { loading: 'CONNECTING', live: 'LIVE', stale: 'STALE', error: 'ERROR' }[status];

  return (
    <div className="page">
      <header className="hdr">
        <div className="brand"><span className="mark">N</span><span>NOX <b>FUND</b></span></div>
        <div className="meta">
          <span className="pill chain"><i className="bnb" />BNB Chain</span>
          <span className={`pill st st-${status}`}><i />{label}</span>
          <button className={`refresh ${busy ? 'spin' : ''}`} onClick={refresh} aria-label="Refresh" title="Refresh">
            <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z" /></svg>
          </button>
        </div>
      </header>

      <div className="sub">
        <span>Block <b className="mono" id="block">{snap ? snap.blockNumber.toLocaleString() : '—'}</b></span>
        <span>Updated <b id="updated">{lastOk ? timeOnly(lastOk) : '—'}</b></span>
      </div>

      {status === 'stale' && <div className="note warn">Connection failed. Showing last values from block {snap?.blockNumber.toLocaleString()} ({lastOk && timeOnly(lastOk)}). {error}</div>}
      {status === 'error' && <div className="note err">Unable to reach BNB Smart Chain. {error}</div>}

      <main className="grid">
        {CARDS.map((c) => (
          <div key={c.key} className={`card ${c.gold ? 'gold' : ''} ${status === 'stale' ? 'is-stale' : ''}`}>
            <span className="title">{c.title}</span>
            <span className="value" title={snap ? exact(snap[c.key]) + ' USDT' : ''}>
              {snap ? usd(snap[c.key]) : <span className="skel" />}
              <small>USDT</small>
            </span>
            <code className="src">{c.src}</code>
          </div>
        ))}
      </main>

      <footer className="ftr">
        <a href={`${BSCSCAN}/address/${CONTRACT}`} target="_blank" rel="noreferrer" className="mono">{CONTRACT.slice(0, 6)}…{CONTRACT.slice(-4)} ↗</a>
        <span>Read-only · BSC chain 56 · refreshes every {REFRESH_MS / 1000}s</span>
      </footer>
    </div>
  );
}
