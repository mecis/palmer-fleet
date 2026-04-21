import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/tracking/positions')
      .then(res => {
        const found = res.data.find(v => String(v.carid) === String(id));
        if (!found) setError('Vozidlo nenájdené');
        else setVehicle(found);
      })
      .catch(() => setError('Nepodarilo sa načítať vozidlo'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Načítavam...</div>;
  if (error)   return (
    <div>
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-secondary" onClick={() => navigate('/vozidla')}>← Späť</button>
    </div>
  );

  const speed    = Number(vehicle.speed);
  const odometer = vehicle.km ? Number(vehicle.km).toLocaleString('sk-SK') : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/vozidla')}
            style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', fontSize: '0.85rem', padding: 0, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            ← Vozidlá
          </button>
          <h1>{vehicle.identifikator || vehicle.carid}</h1>
        </div>
        <span className={`badge ${speed > 0 ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
          {speed > 0 ? `V pohybe · ${speed} km/h` : 'Stojí'}
        </span>
      </div>

      <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Aktuálna poloha */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Aktuálna poloha</h3>
          <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InfoRow label="Rýchlosť"     value={`${speed} km/h`} />
            <InfoRow label="Odometer"     value={`${odometer} km`} />
            <InfoRow label="Latitude"     value={vehicle.latitude  || '—'} />
            <InfoRow label="Longitude"    value={vehicle.longitude || '—'} />
            <InfoRow label="Čas (local)"  value={vehicle.localpostime ? new Date(vehicle.localpostime).toLocaleString('sk-SK') : '—'} />
            <InfoRow label="Čas (UTC)"    value={vehicle.positiontime ? new Date(vehicle.positiontime).toLocaleString('sk-SK') : '—'} />
          </div>
          {vehicle.latitude && vehicle.longitude && (
            <a
              href={`https://www.google.com/maps?q=${vehicle.latitude},${vehicle.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ marginTop: '1rem', display: 'inline-block' }}
            >
              Otvoriť v Google Maps →
            </a>
          )}
        </div>

        {/* Vodič a vozidlo */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Vozidlo a vodič</h3>
          <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InfoRow label="Vodič"   value={vehicle.driver || '—'} />
            <InfoRow label="Car ID"  value={vehicle.carid  || '—'} />
          </div>
        </div>

      </div>

      <div className="card" style={{ marginTop: '1.25rem', padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)' }}>
        Ďalšie informácie budú doplnené
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{value}</div>
    </div>
  );
}

export default VehicleDetail;
