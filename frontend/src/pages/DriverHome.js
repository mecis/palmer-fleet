import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// "HH:MM:SS" -> "X h Y min"
function formatDriveTime(str) {
  if (!str || typeof str !== 'string') return '—';
  const [hStr, mStr] = str.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  if (h === 0 && m === 0) return '0 h';
  return `${h} h${m ? ` ${m} min` : ''}`;
}

function formatKm(km) {
  if (km === null || km === undefined) return '—';
  return Number(km).toLocaleString('sk-SK', { maximumFractionDigits: 0 }) + ' km';
}

function DriverHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wdId = user?.wd_driver_id;
    api.get('/tracking/drivers')
      .then(r => {
        // backend mi pre vodica vracia uz len mna, ale pre istotu hladam
        const found = r.data.find(d => Number(d.iddriver) === Number(wdId)) || r.data[0];
        setMe(found || null);
      })
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, [user?.wd_driver_id]);

  const moeAuto = me?.current_spz || me?.assigned_cars?.[0] || '';

  const goToMyVehicle = () => {
    if (!moeAuto) return;
    navigate('/vozidla', { state: { openEcv: moeAuto } });
  };

  const goToMyProfile = () => {
    if (!user?.wd_driver_id) return;
    navigate('/vodici', { state: { openDriverId: user.wd_driver_id } });
  };

  const goToCmrUpload = () => navigate('/cmr', { state: { openUpload: true } });

  return (
    <div className="driver-home">
      <div className="driver-home-hero">
        <h1>Vitaj, {user?.meno || 'vodič'} 👋</h1>
        <p>Tu nájdeš svoje hlavné údaje a rýchle skratky.</p>
      </div>

      {loading ? (
        <div className="driver-home-loading">Načítavam…</div>
      ) : (
        <>
          <div className="driver-home-stats">
            <div className="dh-stat">
              <div className="dh-stat-label">Najazdený čas (od 2020)</div>
              <div className="dh-stat-value">{formatDriveTime(me?.total_drive_time)}</div>
            </div>
            <div className="dh-stat">
              <div className="dh-stat-label">Najazdené kilometre</div>
              <div className="dh-stat-value">{formatKm(me?.total_km)}</div>
            </div>
            <div className="dh-stat">
              <div className="dh-stat-label">Aktuálny stav</div>
              <div className="dh-stat-value">
                {me?.is_driving ? (
                  <span style={{ color: '#16a34a' }}>▶ V pohybe · {me.current_speed} km/h</span>
                ) : (
                  <span style={{ color: '#6b7280' }}>Stojí</span>
                )}
              </div>
            </div>
          </div>

          <div className="driver-home-actions">
            <button className="dh-action" onClick={goToMyVehicle} disabled={!moeAuto}>
              <div className="dh-action-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>🚛</div>
              <div className="dh-action-text">
                <div className="dh-action-title">Moje vozidlo</div>
                <div className="dh-action-sub">{moeAuto || 'Žiadne priradené'}</div>
              </div>
            </button>

            <button className="dh-action" onClick={goToMyProfile}>
              <div className="dh-action-icon" style={{ background: '#dcfce7', color: '#15803d' }}>👤</div>
              <div className="dh-action-text">
                <div className="dh-action-title">Môj profil vodiča</div>
                <div className="dh-action-sub">Detaily, dokumenty</div>
              </div>
            </button>

            <button className="dh-action" onClick={goToCmrUpload}>
              <div className="dh-action-icon" style={{ background: '#fef3c7', color: '#a16207' }}>📄</div>
              <div className="dh-action-text">
                <div className="dh-action-title">Nahrať CMR</div>
                <div className="dh-action-sub">Po skončení prepravy</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DriverHome;
