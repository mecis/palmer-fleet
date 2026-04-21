import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STAVY = {
  dobry:        { label: 'Dobrý',       color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  upozornujuci: { label: 'Upozornenie', color: '#d97706', bg: '#fef9c3', border: '#fde68a' },
  expirovany:   { label: 'Expirovaný',  color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  v_rieseni:    { label: 'V riešení',   color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
};

function daysColor(dni) {
  if (dni < 0)   return { bg: '#fef2f2', border: '#fca5a5' };
  if (dni < 30)  return { bg: '#fff7ed', border: '#fdba74' };
  if (dni < 90)  return { bg: '#fefce8', border: '#fde047' };
  return         { bg: '#f0fdf4', border: '#86efac' };
}

function StavDropdown({ item, isDriver, canEdit, onStavChange }) {
  const info = STAVY[item.stav] || STAVY.dobry;
  const [saving, setSaving] = useState(false);

  const patchStav = async (newStav) => {
    if (isDriver) {
      return api.patch(`/reminders/driver/${item.wd_driver_id}`, { stav_field: item.stav_field, stav: newStav });
    }
    return api.patch(`/reminders/${item.id}`, { stav: newStav });
  };

  const handleChange = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      const res = await patchStav(e.target.value);
      onStavChange(item, res.data.stav, res.data.stav_manual);
    } catch {}
    finally { setSaving(false); }
  };

  const handleReset = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      const res = await patchStav('auto');
      onStavChange(item, res.data.stav, res.data.stav_manual);
    } catch {}
    finally { setSaving(false); }
  };

  if (!canEdit) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600, background: info.bg, color: info.color, border: `1px solid ${info.border}`, whiteSpace: 'nowrap' }}>
        {info.label}
      </span>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
      <select
        value={item.stav || 'dobry'}
        onChange={handleChange}
        disabled={saving}
        style={{
          fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.45rem',
          borderRadius: '10px', border: `1px solid ${info.border}`,
          background: info.bg, color: info.color, cursor: 'pointer', outline: 'none',
        }}
      >
        {Object.entries(STAVY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {item.stav_manual && (
        <button onClick={handleReset} title="Resetovať na automatický stav" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.75rem', padding: '0.1rem 0.25rem', lineHeight: 1 }}>↺</button>
      )}
    </div>
  );
}

function ReminderRow({ item, isDriver, canEdit, onStavChange }) {
  const c = daysColor(item.dni);
  const daysText = item.dni < 0 ? 'Expirované' : `${item.dni} dní`;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.75rem 1rem', marginBottom: '0.5rem',
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px',
      gap: '0.75rem',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.typ}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>
          {new Date(item.datum_expiracie).toLocaleDateString('sk-SK')}
          {item.poznamka && <span style={{ marginLeft: '0.5rem' }}>· {item.poznamka}</span>}
        </div>
      </div>
      <StavDropdown item={item} isDriver={isDriver} canEdit={canEdit} onStavChange={onStavChange} />
      <span style={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', color: item.dni < 0 ? '#dc2626' : item.dni < 30 ? '#ea580c' : item.dni < 90 ? '#ca8a04' : '#16a34a' }}>
        {daysText}
      </span>
    </div>
  );
}

function Column({ title, items, renderItem }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-700)', borderBottom: '2px solid var(--gray-200)', paddingBottom: '0.5rem' }}>
        {title}
      </h2>
      {items.length === 0
        ? <div style={{ color: 'var(--gray-400)', fontSize: '0.9rem', padding: '1rem 0' }}>Žiadne upomienky</div>
        : items.map((item, i) => renderItem(item, i))
      }
    </div>
  );
}

function Reminders() {
  const [data, setData]       = useState({ vehicles: [], drivers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = ['admin', 'dispecer', 'manazer'].includes(user?.rola);

  useEffect(() => {
    api.get('/reminders')
      .then(r => setData(r.data))
      .catch(() => setError('Nepodarilo sa načítať upomienky'))
      .finally(() => setLoading(false));
  }, []);

  const handleStavChange = useCallback((item, stav, stavManual) => {
    setData(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === item.id ? { ...v, stav, stav_manual: stavManual } : v),
      drivers:  d.drivers.map(dr =>
        dr.wd_driver_id === item.wd_driver_id && dr.stav_field === item.stav_field
          ? { ...dr, stav, stav_manual: stavManual }
          : dr
      ),
    }));
  }, []);

  if (loading) return <div className="loading">Načítavam upomienky...</div>;

  // Zoskup vozidlá podľa ecv
  const vehicleGroups = data.vehicles.reduce((acc, v) => {
    const key = v.ecv;
    if (!acc[key]) acc[key] = { nazov: v.nazov, ecv: v.ecv, items: [] };
    acc[key].items.push(v);
    return acc;
  }, {});

  // Zoskup vodičov podľa wd_driver_id
  const driverGroups = data.drivers.reduce((acc, d) => {
    const key = d.wd_driver_id;
    if (!acc[key]) acc[key] = { meno: d.meno, wd_driver_id: d.wd_driver_id, items: [] };
    acc[key].items.push(d);
    return acc;
  }, {});

  const sortedVehicles = Object.values(vehicleGroups).sort((a, b) =>
    Math.min(...a.items.map(i => i.dni)) - Math.min(...b.items.map(i => i.dni))
  );
  const sortedDrivers = Object.values(driverGroups).sort((a, b) =>
    Math.min(...a.items.map(i => i.dni)) - Math.min(...b.items.map(i => i.dni))
  );

  return (
    <div>
      <div className="page-header">
        <h1>Upomienky</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="reminders-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Stĺpec: Vozidlá */}
        <Column
          title={`Vozidlá (${data.vehicles.length})`}
          items={sortedVehicles}
          renderItem={(group, i) => (
            <div
              key={i}
              className="card"
              onClick={() => navigate('/vozidla', { state: { openEcv: group.ecv } })}
              style={{ marginBottom: '1rem', padding: '1rem', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                  {group.nazov} · <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}>{group.ecv}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Detail →</span>
              </div>
              {group.items.map((item, j) => (
                <ReminderRow key={j} item={item} canEdit={canEdit} onStavChange={handleStavChange} />
              ))}
            </div>
          )}
        />

        {/* Stĺpec: Vodiči */}
        <Column
          title={`Vodiči (${data.drivers.length})`}
          items={sortedDrivers}
          renderItem={(group, i) => (
            <div
              key={i}
              className="card"
              onClick={() => navigate('/vodici', { state: { openDriverId: group.wd_driver_id } })}
              style={{ marginBottom: '1rem', padding: '1rem', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{group.meno}</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Detail →</span>
              </div>
              {group.items.map((item, j) => (
                <ReminderRow key={j} item={item} isDriver canEdit={canEdit} onStavChange={handleStavChange} />
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}

export default Reminders;
