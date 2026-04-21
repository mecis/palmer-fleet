import { useState, useEffect } from 'react';
import api from '../services/api';

const TABS = [
  { key: 'cars',           label: 'Vozidlá' },
  { key: 'positions',      label: 'Polohy' },
  { key: 'trailers',       label: 'Prívesy' },
  { key: 'cargroups',      label: 'Skupiny' },
  { key: 'drivers',        label: 'Vodiči' },
  { key: 'drivers2',       label: 'Vodiči 2' },
  { key: 'fuel_cards',     label: 'Pah. karty' },
  { key: 'car_atribut',    label: 'Atribúty auta*' },
  { key: 'warning_lights', label: 'Kontrolky*' },
  { key: 'logbook',        label: 'Kniha jázd*' },
  { key: 'overspeed',      label: 'Rýchlosť*' },
  { key: 'border_crossing',label: 'Hranice*' },
  { key: 'sta_cars',       label: 'Štat. vozidiel' },
  { key: 'sta_drivers',    label: 'Štat. vodičov' },
  { key: 'driver_rating',  label: 'Hodnotenie*' },
];

function FieldTable({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    if (rows?.error) return <div className="alert alert-error">{rows.error}</div>;
    return <div style={{ color: 'var(--gray-400)', padding: '1rem 0' }}>Žiadne dáta</div>;
  }

  const fields = Object.keys(rows[0]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ background: 'var(--gray-50)', position: 'sticky', top: 0 }}>
            <th style={thStyle}>#</th>
            {fields.map(f => (
              <th key={f} style={thStyle}>{f}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <td style={{ ...tdStyle, color: 'var(--gray-400)', width: 32 }}>{i + 1}</td>
              {fields.map(f => (
                <td key={f} style={tdStyle}>
                  {renderCell(f, row[f])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(field, value) {
  if (value === null || value === undefined || value === '') {
    return <span style={{ color: 'var(--gray-300)' }}>—</span>;
  }
  if (field === 'online' || field === 'disabled' || field === 'immobilizer' || field === 'carsharing') {
    return (
      <span style={{
        display: 'inline-block', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600,
        background: Number(value) === 1 ? '#dcfce7' : '#f3f4f6',
        color: Number(value) === 1 ? '#16a34a' : '#6b7280',
      }}>
        {Number(value) === 1 ? 'Áno' : 'Nie'}
      </span>
    );
  }
  if (field === 'speed') {
    return Number(value) > 0
      ? <span style={{ color: '#2563eb', fontWeight: 600 }}>{value} km/h</span>
      : <span style={{ color: 'var(--gray-400)' }}>0</span>;
  }
  if ((field === 'latitude' || field === 'longitude') && value) {
    return <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{value}</span>;
  }
  if (field.includes('date') || field.includes('time')) {
    return <span style={{ whiteSpace: 'nowrap' }}>{value}</span>;
  }
  return String(value);
}

const thStyle = {
  padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600,
  color: 'var(--gray-500)', whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--gray-200)',
  fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em',
};
const tdStyle = {
  padding: '0.45rem 0.75rem', verticalAlign: 'middle',
  maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

function FieldLegend({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const fields = Object.keys(rows[0]);
  const sample = rows[0];
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
        Dostupné polia ({fields.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {fields.map(f => (
          <span key={f} style={{
            display: 'inline-flex', gap: '0.3rem', alignItems: 'center',
            background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
            borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{f}</span>
            <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem' }}>
              {sample[f] !== null && sample[f] !== '' ? `= ${String(sample[f]).slice(0, 20)}` : 'prázdne'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function WdDebug() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState('cars');

  useEffect(() => {
    api.get('/tracking/wd-raw')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Chyba pri načítaní'))
      .finally(() => setLoading(false));
  }, []);

  const tabStyle = active => ({
    padding: '0.5rem 1.1rem', border: 'none', cursor: 'pointer',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    background: 'none', fontWeight: active ? 600 : 400,
    color: active ? 'var(--primary)' : 'var(--gray-500)', fontSize: '0.9rem',
  });

  const rows = data?.[tab];
  const count = Array.isArray(rows) ? rows.length : 0;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h1>WD Debug</h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginTop: '0.2rem' }}>
            Surové dáta z Webdispečink API — prehľad všetkých dostupných polí
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => { setLoading(true); setData(null); api.get('/tracking/wd-raw').then(r => setData(r.data)).finally(() => setLoading(false)); }}>
          Obnoviť
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', paddingLeft: '0.5rem', background: 'var(--gray-50)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {TABS.map(t => (
            <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
              {t.label}
              {data && Array.isArray(data[t.key]) && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', background: tab === t.key ? '#dbeafe' : 'var(--gray-200)', color: tab === t.key ? '#2563eb' : 'var(--gray-500)', borderRadius: '10px', padding: '0.05rem 0.4rem' }}>
                  {data[t.key].length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <div style={{ color: 'var(--gray-400)', padding: '2rem 0', textAlign: 'center' }}>Načítavam dáta z Webdispečink...</div>
          ) : (
            <>
              {data?._meta && tab.endsWith('*') === false && ['car_atribut','warning_lights','logbook','overspeed','border_crossing','driver_rating'].includes(tab) && (
                <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', background: '#fef9c3', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.82rem', color: '#92400e' }}>
                  * Vzorkové dáta pre <strong>carid {data._meta.sample_car_id}</strong> za posledných 30 dní ({data._meta.date_from?.slice(0,10)} – {data._meta.date_to?.slice(0,10)})
                </div>
              )}
              <FieldLegend rows={rows} />
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginBottom: '0.75rem' }}>
                {count} záznamov
              </div>
              <FieldTable rows={rows} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
