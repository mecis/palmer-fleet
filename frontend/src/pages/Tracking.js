import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function StatusBadge({ speed }) {
  if (speed > 0) return <span className="badge badge-success">Jazdí {speed} km/h</span>;
  return <span className="badge badge-secondary">Stojí</span>;
}

function Tracking() {
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const loadPositions = async () => {
    try {
      const res = await api.get('/tracking/positions');
      setVehicles(res.data);
      setLastUpdate(new Date());
      setError('');
      // Aktualizuj vybraté vozidlo ak je otvorené
      setSelected(prev => prev ? (res.data.find(v => v.carid === prev.carid) || prev) : null);
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri načítaní polôh');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await api.get('/tracking/status');
      setConnected(res.data.connected);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    checkStatus();
    loadPositions();
    intervalRef.current = setInterval(loadPositions, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) return <div className="loading">Načítavam polohy...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sledovanie vozidiel</h1>
          {lastUpdate && (
            <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Aktualizované: {lastUpdate.toLocaleTimeString('sk-SK')} · obnova každých 30 s
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {connected !== null && (
            <span className={`badge ${connected ? 'badge-success' : 'badge-danger'}`}>
              Webdispečink: {connected ? 'Online' : 'Offline'}
            </span>
          )}
          <button className="btn btn-secondary" onClick={loadPositions}>Obnoviť</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tracking-layout" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Zoznam vozidiel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {vehicles.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
              Žiadne vozidlá
            </div>
          ) : vehicles.map((v) => (
            <div
              key={v.carid}
              onClick={() => setSelected(selected?.carid === v.carid ? null : v)}
              style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--gray-100)',
                cursor: 'pointer',
                background: selected?.carid === v.carid ? '#eff6ff' : 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{v.identifikator || v.carid}</div>
                <StatusBadge speed={Number(v.speed)} />
              </div>
              {v.driver && (
                <div style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{v.driver}</div>
              )}
              {v.localpostime && (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  {new Date(v.localpostime).toLocaleString('sk-SK')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="card">
            <h2 style={{ marginBottom: '1.25rem' }}>{selected.identifikator || selected.carid}</h2>
            <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <InfoRow label="Vodič"       value={selected.driver || '—'} />
              <InfoRow label="Rýchlosť"    value={selected.speed > 0 ? `${selected.speed} km/h` : 'Stojí'} />
              <InfoRow label="Čas (local)" value={selected.localpostime ? new Date(selected.localpostime).toLocaleString('sk-SK') : '—'} />
              <InfoRow label="Odometer"    value={selected.km ? `${Number(selected.km).toLocaleString('sk-SK')} km` : '—'} />
              <InfoRow label="Lat"         value={selected.latitude || '—'} />
              <InfoRow label="Lng"         value={selected.longitude || '—'} />
            </div>

            {(selected.Location_city || selected.Location_street) && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.2rem' }}>Poloha</div>
                <div>{[selected.Location_street, selected.Location_city, selected.Location_state].filter(Boolean).join(', ')}</div>
              </div>
            )}

            {selected.latitude && selected.longitude && (
              <a
                href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Zobraziť na mape →
              </a>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            Klikni na vozidlo pre zobrazenie detailu
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}

export default Tracking;
