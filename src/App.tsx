import { useEffect, useMemo, useState } from 'react';
import { useData } from './lib/useData';
import { rpcLog } from './lib/chain';
import { CONTRACT, USDT, BSCSCAN, READ_RPCS, REFRESH_MS } from './lib/config';
import { usd, exact, short, dt, timeOnly, bps, toNum, duration } from './lib/format';
import { Badge, Copy, Section, Stat, Skeleton } from './components/ui';
import { Charts } from './components/Charts';
import { Activity } from './components/Activity';
import { WalletPanel } from './components/Wallet';

const NAV = [
  ['overview', 'Overview'], ['stats', 'Protocol Statistics'], ['flows', 'Deposits & Withdrawals'], ['roi', 'ROI Analytics'],
  ['health', 'Contract Health'], ['wallet', 'Wallet Lookup'], ['transparency', 'Transparency'], ['about', 'About'],
] as const;

declare global { interface Window { ethereum?: any } }

export default function App() {
  const { data: d, status, error, lastOk, events, eventsStatus, eventsMsg, refresh, refreshing } = useData();
  const [connected, setConnected] = useState<string | null>(null);
  const [lookup, setLookup] = useState<string | null>(() => new URLSearchParams(location.search).get('address'));
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [calc, setCalc] = useState('1000');
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);

  const loading = !d;
  const stale = status === 'stale';
  const upd = lastOk ? timeOnly(lastOk) : undefined;
  const nextIn = lastOk ? Math.max(0, Math.ceil((lastOk + REFRESH_MS - Date.now()) / 1000)) : null;

  // --- connect wallet: injected EIP-1193 only (MetaMask / Trust Wallet / other in-app browsers). Read-only: only eth_requestAccounts is used.
  async function connect() {
    setWalletErr(null);
    const eth = window.ethereum;
    if (!eth) { setWalletErr('nowallet'); return; }
    try {
      const accts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (accts?.[0]) { setConnected(accts[0]); setLookup(accts[0]); document.getElementById('wallet')?.scrollIntoView({ behavior: 'smooth' }); }
    } catch (e: any) { setWalletErr(e?.message || 'Connection rejected'); }
  }
  useEffect(() => {
    const eth = window.ethereum; if (!eth?.on) return;
    const h = (a: string[]) => { setConnected(a?.[0] ?? null); if (a?.[0]) setLookup(a[0]); };
    eth.on('accountsChanged', h); return () => eth.removeListener?.('accountsChanged', h);
  }, []);
  function goLookup(a: string) {
    setLookup(a);
    const u = new URL(location.href); u.searchParams.set('address', a); history.replaceState(null, '', u);
    document.getElementById('wallet')?.scrollIntoView({ behavior: 'smooth' });
  }

  const m = useMemo(() => {
    if (!d) return null;
    const active = d.globalDeposited - d.globalWithdrawnPrincipal;
    const fee = (d.globalDeposited * d.constants.feeBps) / 10000n;
    const netIn = d.globalDeposited - fee;
    const refTotalBps = d.constants.refBps.reduce((a, b) => a + b, 0n);
    const outKnown = d.globalWithdrawnROI + d.globalWithdrawnPrincipal;
    const impliedRef = netIn - outKnown - d.usdtBalance; // assumes no other inflows/outflows
    const dailyUpper = (active * d.constants.dailyROIBps) / 10000n;
    return {
      active, fee, netIn, refTotalBps, impliedRef, dailyUpper,
      coverage: Number(d.usdtBalance) / Number(active || 1n),
      availCoverage: Number(d.info.availableBalance) / Number(active || 1n),
      roiVsDep: Number(d.globalWithdrawnROI) / Number(d.globalDeposited || 1n),
      avgPerUser: Number(exact(d.globalDeposited)) / Number(d.totalParticipants || 1n),
      daysCover: Number(d.info.availableBalance) / Number(dailyUpper || 1n),
    };
  }, [d]);

  const c = d?.constants;
  const amt = Math.max(0, Number(calc) || 0);
  const daily = c ? (amt * Number(c.dailyROIBps)) / 10000 : 0;

  const statusLabel = { loading: 'CONNECTING', live: 'LIVE', stale: 'STALE', error: 'OFFLINE' }[status];

  return (
    <>
      <div className="bg-orbs" aria-hidden><span /><span /><span /></div>
      <header className="hdr">
        <div className="hdr-row">
          <a href="#overview" className="logo"><span className="logo-mark">N</span><span><b>NOX</b> FUND<small>Live Analytics</small></span></a>
          <div className="hdr-meta">
            <span className="pill chain"><svg viewBox="0 0 32 32" width="14" height="14"><path fill="#F3BA2F" d="M16 4l3.1 3.1-7.8 7.8-3.1-3.1L16 4zm4.7 4.7l3.1 3.1-12.5 12.5-3.1-3.1L20.7 8.7zM7.3 13.4l3.1 3.1-3.1 3.1-3.1-3.1 3.1-3.1zm17.4 0l3.1 3.1L16 28.4l-3.1-3.1 11.8-11.9z"/></svg>BNB Chain · 56</span>
            <span className={`pill status st-${status}`}><i />{statusLabel}</span>
            <span className="upd-txt hide-sm">{upd ? <>Updated {upd}{nextIn !== null && status === 'live' ? ` · next ${nextIn}s` : ''}</> : 'Fetching…'}</span>
            <button className={`btn icon ${refreshing ? 'spin' : ''}`} onClick={refresh} title="Refresh now" aria-label="Refresh">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z"/></svg>
            </button>
            <button className="btn primary sm" onClick={connect}>{connected ? short(connected) : 'Connect'}</button>
          </div>
        </div>
        <nav className="nav">{NAV.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
        <div className="upd-mobile show-sm">{upd ? <>Updated {upd} · block {d?.blockNumber.toString()}</> : 'Fetching on-chain data…'}</div>
      </header>

      {walletErr && (
        <div className="toast" onClick={() => setWalletErr(null)}>
          {walletErr === 'nowallet' ? (
            <>No browser wallet detected. Open this page inside a wallet browser:&nbsp;
              <a className="link" href={`https://metamask.app.link/dapp/${location.host}${location.pathname}`}>MetaMask</a> ·{' '}
              <a className="link" href={`https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(location.href)}`}>Trust Wallet</a>
              . Or paste any address in Wallet Lookup, no wallet needed.</>
          ) : walletErr}
          <span className="x">×</span>
        </div>
      )}

      <main>
        {status === 'error' && <div className="banner err">Can’t reach BNB Smart Chain right now. {error} No numbers are shown until a successful read.</div>}
        {stale && <div className="banner warn">Data is STALE. The last refresh failed ({error}). Showing the last successful values from {upd} (block {d?.blockNumber.toString()}).</div>}

        <section id="overview" className="hero">
          <div className="hero-txt">
            <span className="eyebrow">Read-only · Straight from the contract</span>
            <h1>NOX FUND <span className="grad">Live Blockchain Analytics</span></h1>
            <p className="muted">Every number on this page is read live from the NOX FUND smart contract on BNB Smart Chain, or calculated from those reads with the formula shown. There are no placeholders or simulated values.</p>
            <div className="hero-addr">
              <span className="muted small">Contract</span>
              <a className="mono link" href={`${BSCSCAN}/address/${CONTRACT}`} target="_blank" rel="noreferrer">{short(CONTRACT)}</a><Copy text={CONTRACT} />
              <span className="muted small">Block</span><span className="mono">{d ? d.blockNumber.toLocaleString() : '…'}</span>
            </div>
          </div>
          <div className="legend card">
            <div className="small muted">How to read the badges</div>
            <div><Badge kind="onchain" /> read directly from a contract function</div>
            <div><Badge kind="calculated" /> exact arithmetic on on-chain values</div>
            <div><Badge kind="events" /> aggregated from contract event logs</div>
            <div><Badge kind="estimate" /> derived with stated assumptions</div>
          </div>
        </section>

        <div className="grid stats-grid main-stats">
          <Stat loading={loading} stale={stale} updated={upd} title="Total Historical Deposits" value={d && usd(d.globalDeposited)} unit="USDT" kind="onchain" source="globalDeposited()" desc="All USDT ever deposited (gross, before the deposit fee)." accent="blue" tooltip={d ? exact(d.globalDeposited) : ''} />
          <Stat loading={loading} stale={stale} updated={upd} title="Active Principal" value={m && usd(m.active)} unit="USDT" kind="calculated" source="globalDeposited − globalWithdrawnPrincipal" desc="Principal still staked. ROI withdrawals are not subtracted." accent="purple" />
          <Stat loading={loading} stale={stale} updated={upd} title="Total Principal Returned" value={d && usd(d.globalWithdrawnPrincipal)} unit="USDT" kind="onchain" source="globalWithdrawnPrincipal()" desc="Principal returned to users after unlock." />
          <Stat loading={loading} stale={stale} updated={upd} title="Total ROI Paid" value={d && usd(d.globalWithdrawnROI)} unit="USDT" kind="onchain" source="globalWithdrawnROI()" desc="ROI users have withdrawn so far." accent="gold" tooltip={d ? exact(d.globalWithdrawnROI) : ''} />
          <Stat loading={loading} stale={stale} updated={upd} title="Pending Referral Rewards" value={d && usd(d.totalPendingReferrals)} unit="USDT" kind="onchain" source="totalPendingReferrals()" desc="Referral rewards credited but not yet withdrawn." tooltip={d ? exact(d.totalPendingReferrals) : ''} />
          <Stat loading={loading} stale={stale} updated={upd} title="Contract USDT Balance" value={d && usd(d.usdtBalance)} unit="USDT" kind="onchain" source="USDT.balanceOf(contract)" desc="USDT actually held by the contract right now." accent="blue" tooltip={d ? exact(d.usdtBalance) : ''} />
          <Stat loading={loading} stale={stale} updated={upd} title="Available Contract Balance" value={d && usd(d.info.availableBalance)} unit="USDT" kind="onchain" source="contractInfo().availableBalance_" desc="Balance minus pending referral rewards." accent="green" tooltip={d ? exact(d.info.availableBalance) : ''} />
          <Stat loading={loading} stale={stale} updated={upd} title="Total Participants" value={d && d.totalParticipants.toLocaleString()} kind="onchain" source="totalParticipants()" desc="Unique addresses that have deposited." />
          <Stat loading={loading} stale={stale} updated={upd} title="Registered Usernames" value={d && d.totalUsernames.toLocaleString()} kind="onchain" source="totalUsernames()" desc="Usernames claimed for referral links." />
          <Stat title="Total Active Deposits" value="Unavailable" kind="unavailable" source="no global getter in ABI" desc="The ABI has no global count of deposits. Needs a full event index from deployment (see Transparency)." />
        </div>

        <Section id="stats" eyebrow="Protocol" title="Protocol Statistics" desc="Contract parameters from getConstants(), plus ratios computed from live state.">
          <div className="grid kv-grid">
            <div className="card kv-card">
              <h4>Contract parameters <Badge kind="onchain">getConstants()</Badge></h4>
              {c ? (
                <dl className="kv">
                  <dt>Daily ROI rate</dt><dd>{bps(c.dailyROIBps)} <small>({c.dailyROIBps.toString()} bps)</small></dd>
                  <dt>Max ROI days</dt><dd>{c.maxROIDays.toString()} days</dd>
                  <dt>Principal lock</dt><dd>{duration(Number(c.lockSeconds))} <small>({c.lockSeconds.toString()} s)</small></dd>
                  <dt>Deposit fee</dt><dd>{bps(c.feeBps)}</dd>
                  <dt>Fee recipient</dt><dd className="mono"><a className="link" href={`${BSCSCAN}/address/${c.feeRecipient}`} target="_blank" rel="noreferrer">{short(c.feeRecipient)}</a></dd>
                  <dt>Minimum deposit</dt><dd>{usd(c.minDeposit)} USDT</dd>
                  <dt>Max deposits / user</dt><dd>{c.maxDepositsPerUser.toString()}</dd>
                  <dt>Token</dt><dd className="mono">{short(c.usdtToken)}</dd>
                </dl>
              ) : <Skeleton />}
            </div>
            <div className="card kv-card">
              <h4>Referral levels <Badge kind="onchain">ref1–ref7</Badge></h4>
              {c ? (
                <>
                  <div className="ref-bars">
                    {c.refBps.map((r, i) => (
                      <div key={i} className="ref-bar"><span>L{i + 1}</span><div><i style={{ width: `${(Number(r) / Number(c.refBps[0])) * 100}%` }} /></div><b>{bps(r)}</b></div>
                    ))}
                  </div>
                  <p className="small muted">All 7 levels add up to <b className="gold">{bps(m!.refTotalBps)}</b> of each deposit, credited to upline referral balances. <Badge kind="calculated" /></p>
                </>
              ) : <Skeleton />}
            </div>
            <div className="card kv-card">
              <h4>Derived ratios <Badge kind="calculated" /></h4>
              {m && d ? (
                <dl className="kv">
                  <dt>Average deposited per participant</dt><dd>{usd(m.avgPerUser)} USDT</dd>
                  <dt>ROI paid ÷ total deposits</dt><dd>{(m.roiVsDep * 100).toFixed(2)}%</dd>
                  <dt>Contract balance ÷ active principal</dt><dd>{(m.coverage * 100).toFixed(2)}%</dd>
                  <dt>Available balance ÷ active principal</dt><dd>{(m.availCoverage * 100).toFixed(2)}%</dd>
                  <dt>Usernames ÷ participants</dt><dd>{((Number(d.totalUsernames) / Number(d.totalParticipants || 1n)) * 100).toFixed(1)}%</dd>
                  <dt>Total deposit fees (at {bps(d.constants.feeBps)})</dt><dd>{usd(m.fee)} USDT</dd>
                </dl>
              ) : <Skeleton />}
            </div>
          </div>
        </Section>

        <Section id="flows" eyebrow="Activity" title="Deposits & Withdrawals" desc="Built from the contract’s Deposited, ROIWithdrawn, PrincipalWithdrawn, ReferralPaid, ReferralWithdrawn, UsernameClaimed and FeeSent event logs.">
          {eventsStatus === 'syncing' && !events?.events.length && <div className="notice">{eventsMsg || 'Syncing event logs…'}</div>}
          {eventsStatus === 'error' && <div className="notice err">Event logs unavailable: {eventsMsg}. Charts show cached data, if any.</div>}
          <Charts store={events} />
          <Activity store={events} onLookup={goLookup} />
        </Section>

        <Section id="roi" eyebrow="Returns" title="ROI Analytics" desc="These are the contract’s own stated parameters. They describe how the code calculates ROI. They are not a promise or a guarantee of any future return.">
          <div className="grid kv-grid">
            <div className="card kv-card">
              <h4>Contract-stated ROI terms <Badge kind="onchain">getConstants()</Badge></h4>
              {c ? (
                <dl className="kv">
                  <dt>Daily rate</dt><dd className="gold">{bps(c.dailyROIBps)} of principal / day</dd>
                  <dt>Max ROI days</dt><dd>{c.maxROIDays.toString()}</dd>
                  <dt>Max total ROI per deposit (simple)</dt><dd>{((Number(c.dailyROIBps) * Number(c.maxROIDays)) / 100).toLocaleString()}% <Badge kind="calculated" /></dd>
                  <dt>Principal lock</dt><dd>{Number(c.lockSeconds) / 86400} days</dd>
                  <dt>Compounding</dt><dd>Not assumed. The rate is applied to principal per day.</dd>
                </dl>
              ) : <Skeleton />}
            </div>
            <div className="card kv-card calc">
              <h4>Formula calculator <Badge kind="estimate">Contract formula</Badge></h4>
              <label className="small muted" htmlFor="calc">Principal (USDT)</label>
              <input id="calc" inputMode="decimal" value={calc} onChange={(e) => setCalc(e.target.value.replace(/[^0-9.]/g, ''))} />
              {c && (
                <dl className="kv">
                  <dt>Daily, per formula</dt><dd>{usd(daily)} USDT</dd>
                  <dt>30 days, per formula</dt><dd>{usd(daily * 30)} USDT</dd>
                  <dt>{c.maxROIDays.toString()} days, per formula</dt><dd>{usd(daily * Number(c.maxROIDays))} USDT</dd>
                  <dt>Deposit fee ({bps(c.feeBps)})</dt><dd>{usd((amt * Number(c.feeBps)) / 10000)} USDT</dd>
                </dl>
              )}
              <p className="small muted">This only shows the contract’s arithmetic. Actual payouts depend on the contract holding enough USDT when someone withdraws. Nothing here is guaranteed.</p>
            </div>
            <div className="card kv-card">
              <h4>ROI paid vs obligations</h4>
              {m && d ? (
                <dl className="kv">
                  <dt>Total ROI paid <Badge kind="onchain" /></dt><dd>{usd(d.globalWithdrawnROI)} USDT</dd>
                  <dt>ROI accrual on active principal, upper bound <Badge kind="estimate" /></dt><dd>{usd(m.dailyUpper)} USDT / day</dd>
                  <dt>Days the available balance covers at that rate <Badge kind="estimate" /></dt><dd>{m.daysCover.toFixed(1)} days</dd>
                </dl>
              ) : <Skeleton />}
              <p className="small muted">The upper bound assumes every active deposit is still accruing: active principal × {c ? bps(c.dailyROIBps) : '…'}. Deposits that hit the ROI maximum stop accruing, so the real figure can be lower. It also ignores new deposits and referral withdrawals.</p>
            </div>
          </div>
        </Section>

        <Section id="health" eyebrow="Status" title="Contract Health" desc="Connection and state checks for the dashboard’s data sources.">
          <div className="grid kv-grid">
            <div className="card kv-card">
              <h4>Connection</h4>
              <dl className="kv">
                <dt>BNB Chain connection</dt><dd><span className={`pill status st-${status}`}><i />{statusLabel}</span></dd>
                <dt>Latest successful block</dt><dd className="mono">{d ? d.blockNumber.toLocaleString() : '—'}</dd>
                <dt>Block time</dt><dd>{d ? dt(d.blockTime) : '—'}</dd>
                <dt>Last refresh</dt><dd>{lastOk ? new Date(lastOk).toLocaleString() : '—'}</dd>
                <dt>Auto-refresh</dt><dd>every {REFRESH_MS / 1000}s</dd>
                <dt>Event log sync</dt><dd>{eventsStatus === 'ok' ? `OK · to block ${events?.toBlock.toLocaleString()}` : eventsStatus === 'error' ? 'Failed' : eventsStatus}</dd>
                <dt>Active RPC</dt><dd className="mono small">{d?.rpc.replace('https://', '') ?? '—'}</dd>
              </dl>
              <div className="rpc-list">
                {READ_RPCS.map((u) => { const s = rpcLog.find((r) => r.url === u); return (
                  <span key={u} className={`rpc ${s ? (s.ok ? 'ok' : 'bad') : ''}`} title={s?.error || ''}><i />{u.replace('https://', '')}</span>
                ); })}
              </div>
            </div>
            <div className="card kv-card">
              <h4>Balances &amp; liabilities</h4>
              <dl className="kv">
                <dt>Contract address</dt><dd className="mono small">{short(CONTRACT)} <Copy text={CONTRACT} /></dd>
                <dt>USDT token</dt><dd className="mono small">{short(USDT)} <Copy text={USDT} /></dd>
                <dt>Contract USDT balance <Badge kind="onchain" /></dt><dd>{d ? usd(d.usdtBalance) : '—'}</dd>
                <dt>Available balance <Badge kind="onchain" /></dt><dd>{d ? usd(d.info.availableBalance) : '—'}</dd>
                <dt>Active principal <Badge kind="calculated" /></dt><dd>{m ? usd(m.active) : '—'}</dd>
                <dt>Pending referral rewards <Badge kind="onchain" /></dt><dd>{d ? usd(d.totalPendingReferrals) : '—'}</dd>
                <dt>Total participants <Badge kind="onchain" /></dt><dd>{d ? d.totalParticipants.toLocaleString() : '—'}</dd>
              </dl>
              {m && (
                <div className="meter">
                  <div className="meter-top"><span className="small muted">Balance ÷ active principal</span><b>{(m.coverage * 100).toFixed(1)}%</b></div>
                  <div className="bar"><i style={{ width: `${Math.min(100, m.coverage * 100)}%` }} /></div>
                </div>
              )}
              <div className="btn-row">
                <a className="btn primary" href={`${BSCSCAN}/address/${CONTRACT}`} target="_blank" rel="noreferrer">View Contract on BscScan ↗</a>
                <a className="btn ghost" href={`${BSCSCAN}/token/${USDT}`} target="_blank" rel="noreferrer">View USDT Token on BscScan ↗</a>
              </div>
            </div>
          </div>
        </Section>

        <Section id="wallet" eyebrow="Personal" title="Wallet Lookup" desc="Analyze any address, read-only. You can connect MetaMask or Trust Wallet to fill in your own address automatically. Connecting only shares your address. The site never asks for a signature, a transaction, or a seed phrase.">
          <WalletPanel address={lookup} constants={c} onAddress={goLookup} connected={connected} />
        </Section>

        <Section id="transparency" eyebrow="Verification" title="Transparency" desc="How every figure is produced, live consistency checks, and what this dashboard cannot know from the ABI.">
          <div className="grid kv-grid">
            <div className="card kv-card">
              <h4>Live consistency checks <Badge kind="onchain">block {d?.blockNumber.toString() ?? '…'}</Badge></h4>
              <ul className="checks">
                {d ? d.checks.map((ch) => <li key={ch.name} className={ch.ok ? 'ok' : 'bad'}><i>{ch.ok ? '✓' : '✕'}</i>{ch.name}</li>) : <Skeleton />}
              </ul>
              <p className="small muted">All reads in one refresh are pinned to the same block number, so the values are consistent with each other.</p>
            </div>
            <div className="card kv-card">
              <h4>Money-flow reconciliation <Badge kind="estimate" /></h4>
              {m && d ? (
                <dl className="kv">
                  <dt>Gross deposits <Badge kind="onchain" /></dt><dd>{usd(d.globalDeposited)}</dd>
                  <dt>− Deposit fees ({bps(d.constants.feeBps)}) <Badge kind="calculated" /></dt><dd>−{usd(m.fee)}</dd>
                  <dt>− ROI withdrawn <Badge kind="onchain" /></dt><dd>−{usd(d.globalWithdrawnROI)}</dd>
                  <dt>− Principal withdrawn <Badge kind="onchain" /></dt><dd>−{usd(d.globalWithdrawnPrincipal)}</dd>
                  <dt>− Current balance <Badge kind="onchain" /></dt><dd>−{usd(d.usdtBalance)}</dd>
                  <dt><b>= Implied referral withdrawals</b></dt><dd className="gold"><b>{usd(m.impliedRef)}</b></dd>
                </dl>
              ) : <Skeleton />}
              <p className="small muted">The ABI has no global “total referral withdrawn” getter, so this figure is a remainder. It assumes the only USDT flows are deposits, the {c ? bps(c.feeBps) : ''} fee, and the three withdrawal types. Any direct USDT transfers to the contract, or other outflows, would change it.</p>
            </div>
            <div className="card kv-card">
              <h4>Formulas</h4>
              <ul className="formulas">
                <li><b>Active Principal</b> = globalDeposited() − globalWithdrawnPrincipal(). ROI is <u>not</u> subtracted.</li>
                <li><b>Available Balance</b> = contractInfo().availableBalance_, which matches balanceOf(contract) − totalPendingReferrals() (checked live).</li>
                <li><b>Deposit fee</b> = globalDeposited × feeBps ÷ 10,000. Deposited events record the gross amount, and FeeSent records the fee paid out.</li>
                <li><b>Wallet active principal</b> = Σ depositInfo(user,i).principal_ where isWithdrawn_ = false.</li>
                <li><b>Referral withdrawn (wallet)</b> = totalReferralEarned(user) − refBalance(user).</li>
                <li>Every token amount is converted with USDT’s 18 decimals. Hover a value to see its full precision.</li>
              </ul>
            </div>
            <div className="card kv-card" style={{ gridColumn: '1 / -1' }}>
              <h4>Data limits <Badge kind="unavailable">Read this</Badge></h4>
              <ul className="formulas">
                <li><b>Event history window.</b> Free public BSC RPCs only serve the last few hours of logs (about 58k blocks, roughly 7 hours, when this was built). Charts and the activity feed start at the oldest log the RPC still has: <b>{events ? dt(Math.min(...(events.events.length ? events.events.map((e) => e.time) : [0]))) : '…'}</b>. Your browser caches the logs and keeps adding to them on later visits. Lifetime totals in the cards come from contract state, so they are always complete.</li>
                <li><b>Total Active Deposits (count)</b> and <b>a historical trend of active principal or TVL</b> are not in the ABI. Both need every Deposited and PrincipalWithdrawn event since deployment. That requires an indexer: an archive or paid RPC, the BscScan API (paid for BSC), or a small backend or cron job that saves logs over time.</li>
                <li><b>Global referral withdrawn</b> has no getter, so it’s shown above as an implied remainder.</li>
                <li><b>Wallet connect.</b> MetaMask, Trust Wallet and other injected wallets are supported. WalletConnect needs a registered project ID, so it isn’t included.</li>
              </ul>
            </div>
          </div>
          <div className="notice warn">Risk notice: this is a third-party analytics view of a smart contract. Rates shown are the contract’s parameters, not promises. Payouts depend entirely on the USDT the contract holds. Do your own research. Nothing here is financial advice.</div>
        </Section>

        <Section id="about" eyebrow="About" title="About this dashboard">
          <div className="card about">
            <p>NOX FUND Live Analytics is a read-only window into the NOX FUND contract on BNB Smart Chain (chain ID 56). It reads the verified contract functions from the project ABI using public RPC endpoints with automatic fallback. No backend, API key or private key is involved, and the page can never trigger a transaction.</p>
            <div className="about-grid">
              <div><span className="muted small">Contract</span><a className="mono link" href={`${BSCSCAN}/address/${CONTRACT}`} target="_blank" rel="noreferrer">{CONTRACT}</a></div>
              <div><span className="muted small">USDT (BEP-20, 18 decimals)</span><a className="mono link" href={`${BSCSCAN}/token/${USDT}`} target="_blank" rel="noreferrer">{USDT}</a></div>
              <div><span className="muted small">Functions read</span><span className="small">contractInfo, globalDeposited, globalWithdrawnPrincipal, globalWithdrawnROI, totalParticipants, totalPendingReferrals, totalUsernames, getConstants, depositCount, depositInfo, totalDeposited, totalWithdrawnPrincipal, totalWithdrawnROI, totalReferralEarned, refBalance, pendingROIAll, timeUntilUnlock, addressToUsername, usernameToAddress, referrer · USDT.balanceOf</span></div>
            </div>
          </div>
        </Section>
      </main>
      <footer className="ftr">
        <span>NOX FUND · Live Blockchain Analytics</span>
        <span className="muted small">Data: BNB Smart Chain · Block {d?.blockNumber.toString() ?? '…'} · {upd ? (stale ? 'STALE since ' : 'Live at ') + upd : 'connecting'}</span>
      </footer>
    </>
  );
}
