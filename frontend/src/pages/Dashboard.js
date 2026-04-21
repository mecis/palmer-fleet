import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Labels ──────────────────────────────────────────────────────────────────

const SERVIS_LABELS = {
  oprava: 'Oprava', udrzba: 'Údržba', pneu: 'Pneumatiky',
  olej: 'Výmena oleja', brzdy: 'Brzdy', ine: 'Iné',
};
const DOC_LABELS = {
  obciansky_preukaz: 'Občiansky preukaz',
  poistka_vodica:    'Poistka vodiča',
  pracovna_zmluva:   'Pracovná zmluva',
  certifikat_a1:     'Certifikát A1',
  psychotest:        'Psychotest',
  ine:               'Iné',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('sk-SK');
}

function initials(meno, priezvisko) {
  return `${(meno?.[0] || '').toUpperCase()}${(priezvisko?.[0] || '').toUpperCase()}` || '?';
}

// "HH:MM:SS" → seconds
function driveTimeSeconds(str) {
  if (!str || typeof str !== 'string') return 0;
  const [h, m, s] = str.split(':').map(n => parseInt(n, 10) || 0);
  return h * 3600 + m * 60 + (s || 0);
}
// "HH:MM:SS" → "123 h 45 min"
function formatDriveTime(str) {
  if (!str || typeof str !== 'string') return '—';
  const parts = str.split(':');
  if (parts.length < 2) return str;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  if (h === 0 && m === 0) return '0 h';
  return `${h} h${m ? ` ${m} min` : ''}`;
}

function typBadgeClass(typ) {
  const t = (typ || '').toLowerCase();
  if (t.includes('stk'))        return 'dash-typ-stk';
  if (t.includes('emis') || t === 'ek') return 'dash-typ-ek';
  if (t.includes('poist'))      return 'dash-typ-poistenie';
  if (t.includes('tacho'))      return 'dash-typ-tachograf';
  return 'dash-typ-other';
}

function fileType(mime, nazov) {
  const name = (nazov || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  if ((mime || '').startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/.test(name)) return 'JPG';
  return 'PDF';
}

// ── Row state (design thresholds) ───────────────────────────────────────────

function rowState(dni) {
  if (dni < 0)   return { row: 'row-danger',  zos: 'danger',  stav: 'dash-stav-expired', label: 'Expiroval' };
  if (dni <= 7)  return { row: 'row-amber',   zos: 'amber',   stav: 'dash-stav-brzy',    label: 'Čoskoro' };
  if (dni <= 30) return { row: 'row-warning', zos: 'warning', stav: 'dash-stav-brzy',    label: 'Blíži sa' };
  return { row: '', zos: '', stav: 'dash-stav-ok', label: 'V poriadku' };
}

// ── Icons (from design) ─────────────────────────────────────────────────────

const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 5v3h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconWrench = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.8">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const IconPdf = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconJpg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
);

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ variant, icon, label, value, sub, to }) {
  const Tag = to ? Link : 'div';
  const props = to ? { to } : {};
  return (
    <Tag {...props} className={`dash-card dash-stat ${variant}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </Tag>
  );
}

// ── Avatar palette ──────────────────────────────────────────────────────────

const AVATAR_BG = ['#dbeafe', '#dcfce7', '#f3e8ff', '#ffedd5', '#fce7f3'];
const AVATAR_FG = ['#1d4ed8', '#15803d', '#7e22ce', '#c2410c', '#9d174d'];

// ── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const { user } = useAuth();
  const canSeeReminders = ['admin', 'dispecer', 'manazer'].includes(user?.rola);

  const [vehicles, setVehicles]   = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [reminders, setReminders] = useState({ vehicles: [] });
  const [servisy, setServisy]     = useState([]);
  const [dokumenty, setDokumenty] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    const tasks = [
      api.get('/tracking/positions').then(r => setVehicles(r.data)).catch(() => {}),
      api.get('/tracking/drivers').then(r => setDrivers(r.data)).catch(() => {}),
      api.get('/dashboard').then(r => {
        setServisy(r.data.posledne_servisy || []);
        setDokumenty(r.data.posledne_dokumenty_vodicov || []);
      }).catch(() => {}),
    ];
    if (canSeeReminders) {
      tasks.push(api.get('/reminders').then(r => setReminders(r.data)).catch(() => {}));
    }
    Promise.all(tasks).finally(() => {
      setLoading(false);
      setUpdatedAt(new Date());
    });
  }, [canSeeReminders]);

  // Stats
  const totalVehicles  = vehicles.length;
  const driversDriving = drivers.filter(d => d.is_driving).length;
  const vehRem         = reminders.vehicles || [];
  const expiringSoon   = vehRem.filter(r => r.dni >= 0 && r.dni <= 30).length;
  const pastDue        = vehRem.filter(r => r.dni < 0).length;

  // Upcoming deadlines (past + next 30 days)
  const upcoming = [...vehRem]
    .filter(r => r.dni <= 30)
    .sort((a, b) => new Date(a.datum_expiracie) - new Date(b.datum_expiracie))
    .slice(0, 20);

  // Top 5 drivers (by total drive time)
  const topDrivers = [...drivers]
    .filter(d => driveTimeSeconds(d.total_drive_time) > 0)
    .sort((a, b) => driveTimeSeconds(b.total_drive_time) - driveTimeSeconds(a.total_drive_time))
    .slice(0, 5);
  const maxSec = driveTimeSeconds(topDrivers[0]?.total_drive_time) || 1;

  // Driver map for docs
  const driverMap = {};
  drivers.forEach(d => { driverMap[d.iddriver] = d; });

  const subtitle = loading
    ? 'Načítavam…'
    : updatedAt
      ? `Aktualizované: ${updatedAt.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`
      : '';

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <h1>Prehľad</h1>
        <span className="dash-subtitle">{subtitle}</span>
      </div>

      {/* ─── SECTION 1: Stat cards ─────────────────────────────────── */}
      <div className="dash-section">
        <div className="dash-stat-grid">
          <StatCard
            variant="primary"
            icon={<IconTruck />}
            label="Vozidlá spolu"
            value={loading ? '—' : totalVehicles}
            sub="registrovaných vozidiel"
            to="/vozidla"
          />
          <StatCard
            variant="success"
            icon={<IconUsers />}
            label="Vodiči na ceste"
            value={loading ? '—' : driversDriving}
            sub="práve aktívnych"
            to="/vodici"
          />
          {canSeeReminders && (
            <>
              <StatCard
                variant="warning"
                icon={<IconClock />}
                label="Termíny do 30 dní"
                value={loading ? '—' : expiringSoon}
                sub="vyžaduje pozornosť"
                to="/upomienky"
              />
              <StatCard
                variant="danger"
                icon={<IconAlert />}
                label="Po termíne"
                value={loading ? '—' : pastDue}
                sub="po dátume expirácie"
                to="/upomienky"
              />
            </>
          )}
        </div>
      </div>

      {/* ─── SECTION 2: Deadlines + Top drivers ─────────────────────── */}
      <div className="dash-section">
        <div className="dash-section-title">Termíny a vodiči</div>
        <div className="dash-two-col" style={canSeeReminders ? undefined : { gridTemplateColumns: '520px' }}>

          {canSeeReminders && (
            <div className="dash-card dash-table-card">
              <div className="dash-card-header">
                <h2>Nadchádzajúce termíny</h2>
                <span className="dash-badge">{loading ? '—' : upcoming.length}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>EČV</th>
                      <th>Typ</th>
                      <th>Dátum expirácie</th>
                      <th>Zostatok dní</th>
                      <th>Stav</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.length === 0 ? (
                      <tr><td colSpan="5" className="dash-empty">
                        {loading ? 'Načítavam…' : 'Žiadne termíny'}
                      </td></tr>
                    ) : upcoming.map(r => {
                      const s = rowState(r.dni);
                      const zosText = r.dni < 0 ? `−${Math.abs(r.dni)} dní` : `${r.dni} dní`;
                      return (
                        <tr key={r.id} className={s.row}>
                          <td><span className="dash-ecv">{r.ecv}</span></td>
                          <td><span className={`dash-typ-badge ${typBadgeClass(r.typ)}`}>{r.typ}</span></td>
                          <td>{formatDate(r.datum_expiracie)}</td>
                          <td><span className={`dash-zostatok ${s.zos}`}>{zosText}</span></td>
                          <td><span className={`dash-stav-badge ${s.stav}`}>{s.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="dash-card">
            <div className="dash-card-header">
              <h2>Top 5 vodičov</h2>
            </div>
            <div className="dash-driver-list">
              {topDrivers.length === 0 ? (
                <div className="dash-empty">{loading ? 'Načítavam…' : 'Žiadne dáta'}</div>
              ) : topDrivers.map((d, i) => {
                const sec = driveTimeSeconds(d.total_drive_time);
                const pct = Math.max(2, Math.round((sec / maxSec) * 100));
                return (
                  <div key={d.iddriver} className="dash-driver-row">
                    <span className="dash-rank">{i + 1}</span>
                    <div className="dash-avatar" style={{ background: AVATAR_BG[i], color: AVATAR_FG[i] }}>
                      {initials(d.jmeno, d.prijmeni)}
                    </div>
                    <div className="dash-driver-info">
                      <div className="dash-driver-name">{d.jmeno} {d.prijmeni}</div>
                      <div className="dash-driver-km">
                        <div className="dash-progress-bar">
                          <div className="dash-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        {formatDriveTime(d.total_drive_time)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ─── SECTION 3: Service + Documents ─────────────────────────── */}
      <div className="dash-section">
        <div className="dash-section-title">Servis a dokumenty</div>
        <div className="dash-two-col-equal">

          <div className="dash-card">
            <div className="dash-card-header">
              <h2>Posledné servisné záznamy</h2>
            </div>
            <div className="dash-record-list">
              {servisy.length === 0 ? (
                <div className="dash-empty">{loading ? 'Načítavam…' : 'Žiadne záznamy'}</div>
              ) : servisy.map(s => (
                <div key={s.id} className="dash-record-row">
                  <div className="dash-record-icon"><IconWrench /></div>
                  <div className="dash-record-main">
                    <div className="dash-record-title">{SERVIS_LABELS[s.typ_ukonu] || s.typ_ukonu}</div>
                    <div className="dash-record-sub">
                      <span className="dash-ecv" style={{ fontSize: 11 }}>{s.ecv || '—'}</span>
                    </div>
                  </div>
                  <div className="dash-record-date">{formatDate(s.datum_ukonu)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h2>Naposledy nahrané dokumenty</h2>
            </div>
            <div className="dash-record-list">
              {dokumenty.length === 0 ? (
                <div className="dash-empty">{loading ? 'Načítavam…' : 'Žiadne dokumenty'}</div>
              ) : dokumenty.map(doc => {
                const ft     = fileType(doc.mime_type, doc.nazov);
                const driver = driverMap[doc.wd_driver_id];
                const dName  = driver ? `${driver.jmeno} ${driver.prijmeni}` : `Vodič #${doc.wd_driver_id}`;
                const dSpz   = driver?.current_spz || '';
                return (
                  <div key={doc.id} className="dash-record-row">
                    <div className="dash-record-icon" style={{ background: ft === 'PDF' ? '#fee2e2' : '#dbeafe' }}>
                      {ft === 'PDF' ? <IconPdf /> : <IconJpg />}
                    </div>
                    <div className="dash-record-main">
                      <div className="dash-record-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`dash-file-badge dash-file-${ft.toLowerCase()}`}>{ft}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.nazov}
                          <span style={{ color: 'var(--d-muted)', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                            ({DOC_LABELS[doc.typ_dokumentu] || doc.typ_dokumentu})
                          </span>
                        </span>
                      </div>
                      <div className="dash-record-sub">
                        {dName}{dSpz ? <> · <span className="dash-ecv" style={{ fontSize: 11 }}>{dSpz}</span></> : null}
                      </div>
                    </div>
                    <div className="dash-record-date">{formatDate(doc.created_at)}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;
