import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGlobal, syncEvents, loadStore, shortErr, type GlobalData, type EventStore } from './chain';
import { REFRESH_MS } from './config';

export type Status = 'loading' | 'live' | 'stale' | 'error';

export function useData() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [events, setEvents] = useState<EventStore | null>(() => loadStore());
  const [eventsStatus, setEventsStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [eventsMsg, setEventsMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const online = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setRefreshing(true);
    try {
      const g = await fetchGlobal();
      setData(g); setStatus('live'); setError(null); setLastOk(Date.now());
      setEventsStatus('syncing');
      try {
        const ev = await syncEvents(g.blockNumber, setEventsMsg);
        setEvents(ev); setEventsStatus('ok'); setEventsMsg('');
      } catch (e) { setEventsStatus('error'); setEventsMsg(shortErr(e)); }
    } catch (e) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setError((offline ? 'Network offline. ' : '') + shortErr(e));
      setStatus((s) => (s === 'loading' || s === 'error') && !data ? 'error' : 'stale');
    } finally { busy.current = false; setRefreshing(false); }
  }, [data]);

  const refreshRef = useRef(refresh); refreshRef.current = refresh;
  useEffect(() => {
    refreshRef.current();
    const t = setInterval(() => refreshRef.current(), REFRESH_MS);
    const on = () => { online.current = true; refreshRef.current(); };
    const off = () => { online.current = false; setStatus((s) => (s === 'live' ? 'stale' : s)); setError('Network offline'); };
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // A value older than 2 refresh cycles is never presented as live.
  useEffect(() => {
    const t = setInterval(() => { if (lastOk && Date.now() - lastOk > REFRESH_MS * 2.2) setStatus((s) => (s === 'live' ? 'stale' : s)); }, 5000);
    return () => clearInterval(t);
  }, [lastOk]);

  return { data, status, error, lastOk, events, eventsStatus, eventsMsg, refresh, refreshing };
}
