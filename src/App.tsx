import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { fetchSnapshot, shortErr, type Snapshot } from './lib/chain';
import { CONTRACT, BSCSCAN, REFRESH_MS, CHAIN_ID } from './lib/config';
import { usd, exact, timeOnly } from './lib/format';
import { Logo, BnbIcon, RefreshIcon, LinkIcon, IconCoins, IconReturn, IconChart, IconWallet, IconShield, IconPeople } from './Icons';

type Status = 'loading' | 'live' | 'stale' | 'error';
type Key = 'globalDeposited' | 'globalWithdrawnPrincipal' | 'globalWithdrawnROI' | 'usdtBalance' | 'availableBalance' | 'totalPendingReferrals';

const CARDS: { key: Key; title: string; src: string; tone: string; Icon: ComponentType<{ id: string }> }[] = [
  { key: 'globalDeposited', title: 'Total Deposited', src: 'globalDeposited()', tone: 'blue', Icon: IconCoins },
  { key: 'globalWithdrawnPrincipal', title: 'Principal Returned', src: 'globalWithdrawnPrincipal()', tone: 'purple', Icon: IconReturn },
  { key: 'globalWithdrawnROI', title: 'Total ROI Paid', src: 'globalWithdrawnROI()', tone: 'gold', Icon: IconChart },
  { key: 'usdtBalance', title: 'Contract USDT Balance', src: 'USDT.balanceOf(contract)', tone: 'green', Icon: IconWallet },
  { key: 'availableBalance', title: 'Available Contract Balance', src: 'contractInfo().availableBalance_', tone: 'cyan', Icon: IconShield },
  { key: 'totalPendingReferrals', title: 'Pending Referral Rewards', src: 'totalPendingReferrals()', tone: 'violet', Icon: IconPeople },
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
    const off = () => { setStatus(hasData.current ? 'stale' : 'error'); setError('Network offline'); };
    window.addEventListener('online', refresh); window.addEventListener('offline', off);
    return () => { clearInterval(t); window.removeEventListener('online', refresh); window.removeEventListener('offline', off); };
  }, [refresh]);

  // Never present data older than ~2 refresh cycles as live.
  useEffect(() => {
    const t = setInterval(() => { if (lastOk && Date.now() - lastOk > REFRESH_MS * 2.2) setStatus((s) => (s === 'live' ? 'stale' : s)); }, 5000);
    return () => clearInterval(t);
  }, [lastOk]);

  const label = { loading: 'LOADING', live: 'LIVE', stale: 'STALE', error: 'CONNECTION ERROR' }[status];

  return (
    <div className="page">
      <div className="fx" aria-hidden><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /></div>

      <header className="hdr">
        <div className="brand"><Logo /><h1>NOX FUND</h1></div>
        <div className="tagline"><span className="line" /><span className="tag">Live Contract Analytics</span><span className="line" /></div>
        <div className="badges">
          <span className="badge chain"><BnbIcon />BNB Smart Chain ({CHAIN_ID})</span>
          <span className={`badge status st-${status}`} title={error ?? ''}><i />{label}</span>
          <span className="badge">Block: <b id="block">{snap ? snap.blockNumber.toLocaleString() : '—'}</b></span>
          <button className={`badge refresh ${busy ? 'spin' : ''}`} onClick={refresh} title="Refresh now"><RefreshIcon />Auto Refresh: {REFRESH_MS / 1000}s</button>
        </div>
        <div className="updated">Last updated <span id="updated">{lastOk ? timeOnly(lastOk) : '—'}</span></div>
      </header>

      {status === 'stale' && <div className="note warn">Connection failed. Showing last values from block {snap?.blockNumber.toLocaleString()} ({lastOk && timeOnly(lastOk)}). Retrying…</div>}
      {status === 'error' && <div className="note err">Connection Error: unable to reach BNB Smart Chain. Retrying every {REFRESH_MS / 1000}s.</div>}

      <main className="grid">
        {CARDS.map(({ key, title, src, tone, Icon }) => (
          <section key={key} className={`card t-${tone} ${status === 'stale' ? 'is-stale' : ''}`}>
            <div className="card-head">
              <span className="ico"><Icon id={`g-${key}`} /></span>
              <div>
                <h2>{title}</h2>
                <code>{src}</code>
              </div>
            </div>
            <div className="amount" title={snap ? `${exact(snap[key])} USDT` : ''}>
              {snap ? <span className="num">{usd(snap[key])}</span> : <span className="num muted">{status === 'error' ? 'Connection Error' : 'Loading…'}</span>}
              <span className="unit">USDT</span>
            </div>
          </section>
        ))}
      </main>

      <footer className="ftr">
        <div className="ftr-bar">
          <LinkIcon />
          <span>Read-Only</span><i className="sep" />
          <span>Live On-Chain Data</span><i className="sep" />
          <a href={`${BSCSCAN}/address/${CONTRACT}`} target="_blank" rel="noreferrer">NOX FUND Smart Contract</a>
        </div>
      </footer>
    </div>
  );
}
