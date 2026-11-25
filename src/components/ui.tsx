import type { ReactNode } from 'react';

export type SrcKind = 'onchain' | 'calculated' | 'events' | 'estimate' | 'unavailable' | 'wallet';
const LABEL: Record<SrcKind, string> = {
  onchain: 'On-chain', calculated: 'Calculated', events: 'Event logs', estimate: 'Estimate', unavailable: 'Unavailable', wallet: 'On-chain · address',
};
export function Badge({ kind, children }: { kind: SrcKind; children?: ReactNode }) {
  return <span className={`badge badge-${kind}`}>{children ?? LABEL[kind]}</span>;
}

export function Section({ id, eyebrow, title, desc, children }: { id: string; eyebrow: string; title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {desc && <p className="muted">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export function Skeleton({ w = '60%' }: { w?: string }) {
  return <span className="skeleton" style={{ width: w }} />;
}

export function Copy({ text }: { text: string }) {
  return (
    <button className="icon-btn" title="Copy" onClick={() => navigator.clipboard?.writeText(text)} aria-label="Copy to clipboard">
      <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>
    </button>
  );
}

export function Stat({ title, value, unit, desc, source, kind, updated, stale, accent, loading, tooltip }: {
  title: string; value: ReactNode; unit?: string; desc: string; source: string; kind: SrcKind; updated?: string; stale?: boolean; accent?: 'gold' | 'blue' | 'purple' | 'green'; loading?: boolean; tooltip?: string;
}) {
  return (
    <div className={`card stat ${accent ? 'accent-' + accent : ''}`}>
      <div className="stat-top">
        <span className="stat-title">{title}</span>
        <Badge kind={kind} />
      </div>
      <div className="stat-value" title={tooltip}>
        {loading ? <Skeleton w="70%" /> : <>{value}{unit && <span className="unit">{unit}</span>}</>}
      </div>
      <p className="stat-desc">{desc}</p>
      <div className="stat-foot">
        <code className="src">{source}</code>
        {updated && <span className={stale ? 'stale-tag' : 'upd'}>{stale ? 'STALE · ' : ''}{updated}</span>}
      </div>
    </div>
  );
}
