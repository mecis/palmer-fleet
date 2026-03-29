import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AKCIA_LABELS = {
  login:        { label: 'Prihlásenie',       badge: 'badge-success' },
  login_failed: { label: 'Zlyhané prihlásenie', badge: 'badge-danger' },
  user_created: { label: 'Nový používateľ',   badge: 'badge-info' },
  user_updated: { label: 'Úprava používateľa', badge: 'badge-warning' },
};

const PAGE_SIZE = 50;

function SystemLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (filter) params.akcia = filter;
      const res = await api.get('/logs', { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch {
      setError('Nepodarilo sa načítať logy');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <h1>Systémový log</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="log-filter-select"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          >
            <option value="">Všetky udalosti</option>
            <option value="login">Prihlásenia</option>
            <option value="login_failed">Zlyhané prihlásenia</option>
            <option value="user_created">Noví používatelia</option>
            <option value="user_updated">Úpravy používateľov</option>
          </select>
          <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>
            Obnoviť
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Čas</th>
                <th>Udalosť</th>
                <th>Popis</th>
                <th>Používateľ</th>
                <th>IP adresa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    Načítavam...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                    Žiadne záznamy
                  </td>
                </tr>
              ) : logs.map((log) => {
                const meta = AKCIA_LABELS[log.akcia] || { label: log.akcia, badge: 'badge-info' };
                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-500)', fontSize: '0.8rem' }}>
                      {new Date(log.datum).toLocaleString('sk-SK')}
                    </td>
                    <td>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </td>
                    <td>{log.popis}</td>
                    <td>{log.user_meno || <span style={{ color: 'var(--gray-500)' }}>—</span>}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{log.ip_adresa || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid var(--gray-200)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
              {total} záznamov celkom
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                ← Predchádzajúca
              </button>
              <span style={{ padding: '0.625rem 0.75rem', fontSize: '0.875rem' }}>
                {page + 1} / {totalPages}
              </span>
              <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                Ďalšia →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemLog;
