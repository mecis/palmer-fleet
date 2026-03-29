import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TruckIcon = () => (
  <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* Trailer */}
    <rect x="2" y="20" width="118" height="72" rx="4" fill="#2563eb" />
    <rect x="6" y="24" width="110" height="64" rx="2" fill="#1d4ed8" />
    {/* Horizontal lines on trailer */}
    <line x1="6" y1="44" x2="116" y2="44" stroke="#3b82f6" strokeWidth="1.5" />
    <line x1="6" y1="64" x2="116" y2="64" stroke="#3b82f6" strokeWidth="1.5" />
    {/* Cab */}
    <rect x="120" y="32" width="76" height="60" rx="6" fill="#1e40af" />
    {/* Windshield */}
    <rect x="130" y="36" width="50" height="32" rx="3" fill="#93c5fd" opacity="0.9" />
    {/* Windshield reflection */}
    <rect x="132" y="38" width="20" height="8" rx="2" fill="white" opacity="0.3" />
    {/* Door */}
    <rect x="122" y="52" width="28" height="36" rx="2" fill="#1e3a8a" />
    <circle cx="148" cy="70" r="2" fill="#93c5fd" />
    {/* Exhaust */}
    <rect x="186" y="18" width="6" height="20" rx="3" fill="#374151" />
    <ellipse cx="189" cy="16" rx="4" ry="3" fill="#6b7280" opacity="0.6" />
    {/* Front bumper */}
    <rect x="192" y="78" width="6" height="10" rx="2" fill="#374151" />
    {/* Wheels */}
    <circle cx="35" cy="96" r="16" fill="#1f2937" />
    <circle cx="35" cy="96" r="9" fill="#374151" />
    <circle cx="35" cy="96" r="4" fill="#6b7280" />
    <circle cx="95" cy="96" r="16" fill="#1f2937" />
    <circle cx="95" cy="96" r="9" fill="#374151" />
    <circle cx="95" cy="96" r="4" fill="#6b7280" />
    <circle cx="168" cy="96" r="16" fill="#1f2937" />
    <circle cx="168" cy="96" r="9" fill="#374151" />
    <circle cx="168" cy="96" r="4" fill="#6b7280" />
    {/* Headlight */}
    <rect x="193" y="58" width="5" height="10" rx="2" fill="#fef08a" />
    {/* Ground shadow */}
    <ellipse cx="100" cy="114" rx="95" ry="5" fill="#00000015" />
  </svg>
);

function SpeedIndicator({ speed }) {
  const s = Number(speed);
  if (s > 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{s}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>km/h</span>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gray-400)' }}>
      <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>0</span>
      <span style={{ fontSize: '0.75rem' }}>km/h</span>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gray-300)', display: 'inline-block' }} />
    </div>
  );
}

function VehicleCard({ vehicle, onClick }) {
  const speed = Number(vehicle.speed);
  const odometer = vehicle.km ? Number(vehicle.km).toLocaleString('sk-SK') : (vehicle.odometerKm ? Number(vehicle.odometerKm).toLocaleString('sk-SK') : '—');

  return (
    <div
      onClick={onClick}
      className="card vehicle-card"
      style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Obrázok vozidla */}
      <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', padding: '1.25rem 1.5rem 0.75rem', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: '180px', height: '100px' }}>
          <TruckIcon />
        </div>
        {/* Online badge */}
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
          <span className={`badge ${speed > 0 ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
            {speed > 0 ? 'V pohybe' : 'Stojí'}
          </span>
        </div>
      </div>

      {/* Informácie */}
      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        {/* SPZ / Názov */}
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.6rem', letterSpacing: '0.02em' }}>
          {vehicle.identifikator || vehicle.carid}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Vodič */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Vodič</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--gray-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {vehicle.driver || '—'}
            </div>
          </div>

          {/* Rýchlosť */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Rýchlosť</div>
            <SpeedIndicator speed={vehicle.speed} />
          </div>

          {/* Odometer */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Odometer</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)' }}>
              {odometer} km
            </div>
          </div>
        </div>

        {/* Miesto */}
        {(vehicle.Location_city || vehicle.Location_street) && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-100)', fontSize: '0.82rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
            <span style={{ flexShrink: 0 }}>📍</span>
            <span>
              {[vehicle.Location_city, vehicle.Location_state].filter(Boolean).join(', ')}
              {vehicle.Location_street ? ` · ${vehicle.Location_street}` : ''}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tracking/positions')
      .then(res => setVehicles(res.data))
      .catch(() => setError('Nepodarilo sa načítať vozidlá'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Načítavam vozidlá...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Vozidlá</h1>
        <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
          {vehicles.length} vozidiel
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {vehicles.map(v => (
          <VehicleCard
            key={v.carid}
            vehicle={v}
            onClick={() => navigate(`/vozidla/${v.carid}`)}
          />
        ))}
      </div>
    </div>
  );
}

export default Vehicles;
