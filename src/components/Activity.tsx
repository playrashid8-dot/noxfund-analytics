import { useMemo, useState } from 'react';
import type { EventStore, EventName } from '../lib/chain';
import { usd, short, dt, ago } from '../lib/format';
import { BSCSCAN } from '../lib/config';
import { Badge } from './ui';

const TYPES: { k: EventName | 'all'; l: string }[] = [
  { k: 'all', l: 'All' }, { k: 'Deposited', l: 'Deposits' }, { k: 'ROIWithdrawn', l: 'ROI' }, { k: 'PrincipalWithdrawn', l: 'Principal' },
  { k: 'ReferralPaid', l: 'Ref. credited' }, { k: 'ReferralWithdrawn', l: 'Ref. withdrawn' }, { k: 'UsernameClaimed', l: 'Usernames' }, { k: 'FeeSent', l: 'Fees' },
];
const LABEL: Record<EventName, string> = {
  Deposited: 'Deposit', ROIWithdrawn: 'ROI withdrawal', PrincipalWithdrawn: 'Principal withdrawal', ReferralPaid: 'Referral credited',
  ReferralWithdrawn: 'Referral withdrawal', UsernameClaimed: 'Username claimed', FeeSent: 'Deposit fee',
};

export function Activity({ store, onLookup }: { store: EventStore | null; onLookup: (a: string) => void }) {
  const [type, setType] = useState<EventName | 'all'>('all');
  const [n, setN] = useState(25);
  const rows = useMemo(() => (store?.events ?? []).filter((e) => type === 'all' || e.name === type).slice().reverse(), [store, type]);
  return (
    <div className="card table-card">
      <div className="table-head">
        <h4>Live activity feed <small>{rows.length.toLocaleString()} events in coverage window</small></h4>
        <Badge kind="events" />
      </div>
      <div className="chips">
        {TYPES.map((t) => <button key={t.k} className={type === t.k ? 'chip on' : 'chip'} onClick={() => { setType(t.k); setN(25); }}>{t.l}</button>)}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Type</th><th>Address</th><th className="r">Amount (USDT)</th><th>Detail</th><th>Time</th><th>Tx</th></tr></thead>
          <tbody>
            {rows.slice(0, n).map((e) => (
              <tr key={e.tx + e.logIndex}>
                <td><span className={`ev ev-${e.name}`}>{LABEL[e.name]}</span></td>
                <td><button className="link" onClick={() => onLookup(e.user)} title={`Look up ${e.user}`}>{short(e.user)}</button></td>
                <td className="r num">{e.name === 'UsernameClaimed' ? '—' : usd(e.amount)}</td>
                <td className="muted small">
                  {e.name === 'Deposited' && `#${e.extra.depositIndex}${e.extra.depositIndex === '0' ? ' · first deposit' : ''}`}
                  {e.name === 'ROIWithdrawn' && `#${e.extra.depositIndex} · ${e.extra.daysClaimed} day(s)`}
                  {e.name === 'PrincipalWithdrawn' && `#${e.extra.depositIndex} · ROI ${usd(e.extra.roi)}`}
                  {e.name === 'ReferralPaid' && `L${e.extra.level} from ${short(e.extra.depositor)}`}
                  {e.name === 'UsernameClaimed' && `“${e.extra.username}”`}
                </td>
                <td className="small" title={dt(e.time)}>{ago(e.time)}</td>
                <td><a className="link" href={`${BSCSCAN}/tx/${e.tx}`} target="_blank" rel="noreferrer">{e.tx.slice(0, 8)}↗</a></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="empty">{store ? 'No events of this type in the coverage window.' : 'Loading…'}</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > n && <button className="btn ghost wide" onClick={() => setN(n + 50)}>Show more</button>}
    </div>
  );
}
