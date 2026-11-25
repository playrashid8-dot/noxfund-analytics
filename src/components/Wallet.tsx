import { useEffect, useState } from 'react';
import { isAddress, getAddress } from 'viem';
import { fetchWallet, resolveUsername, shortErr, type WalletData, type Constants } from '../lib/chain';
import { usd, short, dt, duration, exact } from '../lib/format';
import { BSCSCAN } from '../lib/config';
import { Badge, Copy, Stat } from './ui';

const ZERO = '0x0000000000000000000000000000000000000000';

export function WalletPanel({ address, constants, onAddress, connected }: { address: string | null; constants?: Constants; onAddress: (a: string) => void; connected: string | null }) {
  const [input, setInput] = useState('');
  const [w, setW] = useState<WalletData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => { const t = setInterval(() => setNow(Date.now() / 1000), 1000); return () => clearInterval(t); }, []);

  async function load(a: string) {
    setLoading(true); setErr(null);
    try { setW(await fetchWallet(getAddress(a))); } catch (e) { setErr(shortErr(e)); } finally { setLoading(false); }
  }
  useEffect(() => { if (address) { setInput(address); load(address); } }, [address]);
  useEffect(() => { if (!address) return; const t = setInterval(() => load(address), 60_000); return () => clearInterval(t); }, [address]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (isAddress(v)) return onAddress(getAddress(v));
    if (!v) return;
    setLoading(true); setErr(null);
    try {
      const a = await resolveUsername(v);
      if (!a || a === ZERO) { setErr(`No address is registered for username “${v}”.`); setLoading(false); return; }
      onAddress(getAddress(a));
    } catch (er) { setErr(shortErr(er)); setLoading(false); }
  }

  const active = w ? w.deposits.filter((d) => !d.isWithdrawn).reduce((a, d) => a + d.principal, 0n) : 0n;
  const locked = w ? w.deposits.filter((d) => !d.isWithdrawn && d.maturesAt > now) : [];
  const nextUnlock = locked.length ? Math.min(...locked.map((d) => d.maturesAt)) : 0;
  const isEmpty = w && w.depositCount === 0 && w.totalReferralEarned === 0n;

  return (
    <div>
      <form className="lookup card" onSubmit={submit}>
        <label htmlFor="addr">Look up any wallet (read-only)</label>
        <div className="lookup-row">
          <input id="addr" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x… address or NOX username" autoComplete="off" spellCheck={false} />
          <button className="btn primary" disabled={loading}>{loading ? 'Reading…' : 'Analyze'}</button>
        </div>
        <p className="muted small">Reads public contract state for any address. No signature, no transaction, nothing is ever sent from your wallet.{connected && <> Connected: <button type="button" className="link" onClick={() => onAddress(connected)}>{short(connected)}</button></>}</p>
        {err && <div className="notice err">{err}</div>}
      </form>

      {w && (
        <>
          <div className="wallet-id card">
            <div>
              <div className="muted small">Address {w.address.toLowerCase() === connected?.toLowerCase() && <span className="badge badge-wallet">Connected wallet</span>}</div>
              <div className="mono addr">{w.address} <Copy text={w.address} /> <a className="link small" href={`${BSCSCAN}/address/${w.address}`} target="_blank" rel="noreferrer">BscScan↗</a></div>
            </div>
            <div className="id-meta">
              <span><span className="muted small">Username</span><b>{w.username || '—'}</b></span>
              <span><span className="muted small">Referrer</span><b className="mono">{w.referrer && w.referrer !== ZERO ? <button className="link" onClick={() => onAddress(w.referrer)}>{short(w.referrer)}</button> : '—'}</b></span>
              <span><span className="muted small">Block</span><b className="mono">{w.blockNumber.toString()}</b></span>
            </div>
          </div>
          {isEmpty && <div className="notice">This address has no deposits and no referral earnings in NOX FUND.</div>}
          <div className="grid stats-grid">
            <Stat title="Total deposited" value={usd(w.totalDeposited)} unit="USDT" kind="wallet" source="totalDeposited(user)" desc="Lifetime USDT this address deposited." tooltip={exact(w.totalDeposited)} />
            <Stat title="Active principal" value={usd(active)} unit="USDT" kind="calculated" source="Σ depositInfo.principal (not withdrawn)" desc="Principal of deposits that are not yet withdrawn." accent="blue" />
            <Stat title="Pending ROI (claimable)" value={usd(w.pendingROIAll)} unit="USDT" kind="wallet" source="pendingROIAll(user)" desc="ROI the contract currently reports as unclaimed." accent="purple" tooltip={exact(w.pendingROIAll)} />
            <Stat title="ROI withdrawn" value={usd(w.totalWithdrawnROI)} unit="USDT" kind="wallet" source="totalWithdrawnROI(user)" desc="ROI already paid out to this address." tooltip={exact(w.totalWithdrawnROI)} />
            <Stat title="Principal withdrawn" value={usd(w.totalWithdrawnPrincipal)} unit="USDT" kind="wallet" source="totalWithdrawnPrincipal(user)" desc="Principal already returned to this address." />
            <Stat title="Referral balance" value={usd(w.refBalance)} unit="USDT" kind="wallet" source="refBalance(user)" desc="Referral rewards waiting to be withdrawn." accent="gold" tooltip={exact(w.refBalance)} />
            <Stat title="Referral earned (lifetime)" value={usd(w.totalReferralEarned)} unit="USDT" kind="wallet" source="totalReferralEarned(user)" desc="All referral rewards credited to this address." />
            <Stat title="Referral withdrawn" value={usd(w.totalReferralEarned > w.refBalance ? w.totalReferralEarned - w.refBalance : 0n)} unit="USDT" kind="calculated" source="totalReferralEarned − refBalance" desc="Derived; the ABI has no direct getter for this." />
            <Stat title="Deposits" value={w.depositCount} kind="wallet" source="depositCount(user)" desc={`Max per user: ${constants ? constants.maxDepositsPerUser.toString() : '—'} (getConstants)`} />
            <Stat title="Next principal unlock" value={nextUnlock ? duration(nextUnlock - now) : locked.length === 0 && w.depositCount ? 'All unlocked' : '—'} kind="calculated" source="min depositInfo.maturesAt − now" desc={nextUnlock ? `Unlocks ${dt(nextUnlock)}` : 'No locked deposits.'} accent="gold" />
          </div>
          {w.deposits.length > 0 && (
            <div className="card table-card">
              <div className="table-head"><h4>Deposits <small>depositInfo(user, i) + timeUntilUnlock(user, i)</small></h4><Badge kind="wallet" /></div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>#</th><th className="r">Principal</th><th>Deposited</th><th>Last ROI claim</th><th>Principal unlock</th><th className="r">ROI days claimed</th><th className="r">Remaining</th><th className="r">Elapsed</th><th className="r">Unclaimed</th><th className="r">Pending ROI</th><th>Status</th></tr></thead>
                  <tbody>
                    {w.deposits.slice().reverse().map((d) => {
                      const left = d.maturesAt - now;
                      return (
                        <tr key={d.index}>
                          <td className="mono">{d.index + 1}</td>
                          <td className="r num">{usd(d.principal)}</td>
                          <td className="small">{dt(d.startTime)}</td>
                          <td className="small">{d.lastClaimTime && d.lastClaimTime !== d.startTime ? dt(d.lastClaimTime) : '—'}</td>
                          <td className="small">{dt(d.maturesAt)}<br /><span className={left > 0 ? 'gold small' : 'pos small'}>{left > 0 ? duration(left) : 'Unlocked'}</span></td>
                          <td className="r">{d.totalROIDaysClaimed}</td>
                          <td className="r">{d.remainingROIDays}</td>
                          <td className="r">{d.daysElapsed}</td>
                          <td className="r">{d.daysUnclaimed}</td>
                          <td className="r num">{usd(d.pendingROI, 4)}</td>
                          <td className="tags">
                            <span className={d.isMatured ? 'tag ok' : 'tag'}>{d.isMatured ? 'Matured' : 'Locked'}</span>
                            {d.isWithdrawn && <span className="tag warn">Principal withdrawn</span>}
                            {d.isROIMaxed && <span className="tag gold">ROI max</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
