import { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import type { ChainEvent, EventStore } from '../lib/chain';
import { toNum, usd, dt } from '../lib/format';
import { Badge } from './ui';

const RANGES = [
  { k: '24h', s: 86400 }, { k: '7d', s: 7 * 86400 }, { k: '30d', s: 30 * 86400 }, { k: '90d', s: 90 * 86400 }, { k: 'All', s: Infinity },
] as const;

const C = { dep: '#00d4ff', roi: '#a855f7', prin: '#f5c451', ref: '#22e3a5', refPaid: '#5b8cff' };

function bucketize(events: ChainEvent[], start: number, end: number) {
  const span = end - start;
  const size = span <= 2 * 86400 ? 3600 : span <= 14 * 86400 ? 6 * 3600 : 86400;
  const first = Math.floor(start / size) * size;
  const rows: any[] = [];
  for (let t = first; t <= end; t += size) rows.push({ t, Deposits: 0, 'ROI withdrawn': 0, 'Principal withdrawn': 0, 'Referral withdrawn': 0, 'Referral credited': 0, count: 0, newUsers: 0 });
  const idx = (t: number) => Math.min(rows.length - 1, Math.max(0, Math.floor((t - first) / size)));
  for (const e of events) {
    const r = rows[idx(e.time)]; const a = toNum(e.amount);
    if (e.name === 'Deposited') { r.Deposits += a; r.count++; if (e.extra.depositIndex === '0') r.newUsers++; }
    else if (e.name === 'ROIWithdrawn') r['ROI withdrawn'] += a;
    else if (e.name === 'PrincipalWithdrawn') r['Principal withdrawn'] += a;
    else if (e.name === 'ReferralWithdrawn') r['Referral withdrawn'] += a;
    else if (e.name === 'ReferralPaid') r['Referral credited'] += a;
  }
  let cum = 0, cumOut = 0;
  for (const r of rows) { cum += r.Deposits; cumOut += r['ROI withdrawn'] + r['Principal withdrawn'] + r['Referral withdrawn']; r.cumIn = cum; r.cumOut = cumOut; }
  return { rows, size };
}

const tick = (size: number) => (t: number) => {
  const d = new Date(t * 1000);
  return size < 86400 ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + (size >= 6 * 3600 ? ' ' + d.getDate() : '') : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const tipStyle = { background: 'rgba(8,12,32,.96)', border: '1px solid rgba(120,140,255,.25)', borderRadius: 12, color: '#e6e9ff', fontSize: 12 };
const fmtTip = (v: any) => (typeof v === 'number' ? usd(v) + ' USDT' : v);

export function Charts({ store }: { store: EventStore | null }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['k']>('All');
  const now = Date.now() / 1000;
  const covStart = store?.events.length ? Math.min(...store.events.map((e) => e.time)) : now;
  const { rows, size, evs, requestedStart } = useMemo(() => {
    const r = RANGES.find((x) => x.k === range)!;
    const requestedStart = r.s === Infinity ? covStart : now - r.s;
    const start = Math.max(requestedStart, covStart);
    const evs = (store?.events ?? []).filter((e) => e.time >= start);
    return { ...bucketize(evs, start, now), evs, requestedStart };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, range, Math.floor(now / 60)]);

  const partial = requestedStart < covStart - 60;
  const totals = useMemo(() => {
    const s = (n: string) => evs.filter((e) => e.name === n).reduce((a, e) => a + toNum(e.amount), 0);
    return { dep: s('Deposited'), roi: s('ROIWithdrawn'), prin: s('PrincipalWithdrawn'), refW: s('ReferralWithdrawn'), refP: s('ReferralPaid'), fee: s('FeeSent'),
      nDep: evs.filter((e) => e.name === 'Deposited').length, nNew: evs.filter((e) => e.name === 'Deposited' && e.extra.depositIndex === '0').length,
      depositors: new Set(evs.filter((e) => e.name === 'Deposited').map((e) => e.user.toLowerCase())).size };
  }, [evs]);
  const pie = [
    { name: 'ROI withdrawn', value: totals.roi, c: C.roi }, { name: 'Referral withdrawn', value: totals.refW, c: C.ref },
    { name: 'Principal withdrawn', value: totals.prin, c: C.prin }, { name: 'Deposit fees', value: totals.fee, c: '#ff6b8b' },
  ].filter((p) => p.value > 0);

  if (!store) return <div className="card empty">Loading event logs from BNB Smart Chain…</div>;

  return (
    <div className="charts">
      <div className="chart-toolbar">
        <div className="seg">
          {RANGES.map((r) => <button key={r.k} className={range === r.k ? 'on' : ''} onClick={() => setRange(r.k)}>{r.k}</button>)}
        </div>
        <Badge kind="events" />
      </div>
      <div className={`notice ${partial ? 'warn' : ''}`}>
        Event coverage: <b>{dt(covStart)}</b> → now (blocks {store.fromBlock.toLocaleString()}–{store.toBlock.toLocaleString()}).
        {partial && <> The {range} range extends before the oldest log the free public RPC still serves, so this view only includes the covered part. Lifetime totals are shown in the cards above from contract state.</>}
      </div>
      <div className="mini-grid">
        <div className="mini"><span>Deposits in view</span><b>{usd(totals.dep)}</b><small>{totals.nDep} txs · {totals.depositors} wallets</small></div>
        <div className="mini"><span>First-time depositors</span><b>{totals.nNew}</b><small>Deposited with depositIndex 0</small></div>
        <div className="mini"><span>ROI withdrawn</span><b>{usd(totals.roi)}</b><small>ROIWithdrawn events</small></div>
        <div className="mini"><span>Referral withdrawn</span><b>{usd(totals.refW)}</b><small>ReferralWithdrawn events</small></div>
        <div className="mini"><span>Principal withdrawn</span><b>{usd(totals.prin)}</b><small>PrincipalWithdrawn events</small></div>
        <div className="mini"><span>Net flow (window)</span><b className={totals.dep - totals.fee - totals.roi - totals.refW - totals.prin >= 0 ? 'pos' : 'neg'}>{usd(totals.dep - totals.fee - totals.roi - totals.refW - totals.prin)}</b><small>deposits − fees − all withdrawals</small></div>
      </div>
      <div className="chart-grid">
        <div className="card chart">
          <h4>Inflows vs outflows <small>cumulative, USDT</small></h4>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={rows} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.dep} stopOpacity={0.5} /><stop offset="1" stopColor={C.dep} stopOpacity={0} /></linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.roi} stopOpacity={0.5} /><stop offset="1" stopColor={C.roi} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(140,160,255,.08)" vertical={false} />
              <XAxis dataKey="t" tickFormatter={tick(size)} stroke="#6b7398" fontSize={11} minTickGap={28} />
              <YAxis stroke="#6b7398" fontSize={11} tickFormatter={(v) => Intl.NumberFormat('en', { notation: 'compact' }).format(v)} />
              <Tooltip contentStyle={tipStyle} labelFormatter={(t) => dt(Number(t))} formatter={fmtTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="cumIn" name="Deposits (cum.)" stroke={C.dep} fill="url(#gIn)" strokeWidth={2} />
              <Area type="monotone" dataKey="cumOut" name="Withdrawals (cum.)" stroke={C.roi} fill="url(#gOut)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart">
          <h4>Activity per {size === 3600 ? 'hour' : size === 86400 ? 'day' : '6 hours'} <small>USDT</small></h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(140,160,255,.08)" vertical={false} />
              <XAxis dataKey="t" tickFormatter={tick(size)} stroke="#6b7398" fontSize={11} minTickGap={28} />
              <YAxis stroke="#6b7398" fontSize={11} tickFormatter={(v) => Intl.NumberFormat('en', { notation: 'compact' }).format(v)} />
              <Tooltip contentStyle={tipStyle} labelFormatter={(t) => dt(Number(t))} formatter={fmtTip} cursor={{ fill: 'rgba(120,140,255,.06)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Deposits" fill={C.dep} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ROI withdrawn" fill={C.roi} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Referral withdrawn" fill={C.ref} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Principal withdrawn" fill={C.prin} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart">
          <h4>Deposit count &amp; new depositors</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(140,160,255,.08)" vertical={false} />
              <XAxis dataKey="t" tickFormatter={tick(size)} stroke="#6b7398" fontSize={11} minTickGap={28} />
              <YAxis stroke="#6b7398" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} labelFormatter={(t) => dt(Number(t))} cursor={{ fill: 'rgba(120,140,255,.06)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="Deposits" fill="#5b8cff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="newUsers" name="First-time depositors" fill="#f5c451" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart">
          <h4>Outflow mix <small>in view</small></h4>
          {pie.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3} stroke="none">
                  {pie.map((p) => <Cell key={p.name} fill={p.c} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle} formatter={fmtTip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty">No outflows in this range.</div>}
        </div>
      </div>
    </div>
  );
}
