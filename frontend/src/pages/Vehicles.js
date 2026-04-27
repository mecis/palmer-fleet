import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ikonka tahaca - SVG inline aby som nemusel pchat ext lib

const TruckIcon = () => (
  <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="2" y="20" width="118" height="72" rx="4" fill="#2563eb" />
    <rect x="6" y="24" width="110" height="64" rx="2" fill="#1d4ed8" />
    <line x1="6" y1="44" x2="116" y2="44" stroke="#3b82f6" strokeWidth="1.5" />
    <line x1="6" y1="64" x2="116" y2="64" stroke="#3b82f6" strokeWidth="1.5" />
    <rect x="120" y="32" width="76" height="60" rx="6" fill="#1e40af" />
    <rect x="130" y="36" width="50" height="32" rx="3" fill="#93c5fd" opacity="0.9" />
    <rect x="132" y="38" width="20" height="8" rx="2" fill="white" opacity="0.3" />
    <rect x="122" y="52" width="28" height="36" rx="2" fill="#1e3a8a" />
    <circle cx="148" cy="70" r="2" fill="#93c5fd" />
    <rect x="186" y="18" width="6" height="20" rx="3" fill="#374151" />
    <ellipse cx="189" cy="16" rx="4" ry="3" fill="#6b7280" opacity="0.6" />
    <rect x="192" y="78" width="6" height="10" rx="2" fill="#374151" />
    <circle cx="35" cy="96" r="16" fill="#1f2937" />
    <circle cx="35" cy="96" r="9" fill="#374151" />
    <circle cx="35" cy="96" r="4" fill="#6b7280" />
    <circle cx="95" cy="96" r="16" fill="#1f2937" />
    <circle cx="95" cy="96" r="9" fill="#374151" />
    <circle cx="95" cy="96" r="4" fill="#6b7280" />
    <circle cx="168" cy="96" r="16" fill="#1f2937" />
    <circle cx="168" cy="96" r="9" fill="#374151" />
    <circle cx="168" cy="96" r="4" fill="#6b7280" />
    <rect x="193" y="58" width="5" height="10" rx="2" fill="#fef08a" />
    <ellipse cx="100" cy="114" rx="95" ry="5" fill="#00000015" />
  </svg>
);

const TrailerIcon = () => (
  <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* Trailer body */}
    <rect x="10" y="18" width="168" height="74" rx="4" fill="#7c3aed" />
    <rect x="14" y="22" width="160" height="66" rx="2" fill="#6d28d9" />
    {/* Horizontal stripes */}
    <line x1="14" y1="44" x2="174" y2="44" stroke="#8b5cf6" strokeWidth="1.5" />
    <line x1="14" y1="64" x2="174" y2="64" stroke="#8b5cf6" strokeWidth="1.5" />
    {/* Rear door lines */}
    <line x1="100" y1="22" x2="100" y2="88" stroke="#8b5cf6" strokeWidth="1.5" />
    {/* Coupling pin */}
    <rect x="3" y="52" width="10" height="8" rx="2" fill="#4c1d95" />
    {/* Rear lights */}
    <rect x="172" y="26" width="6" height="10" rx="1" fill="#f87171" />
    <rect x="172" y="56" width="6" height="8" rx="1" fill="#fbbf24" />
    {/* Wheels */}
    <circle cx="55" cy="96" r="16" fill="#1f2937" />
    <circle cx="55" cy="96" r="9" fill="#374151" />
    <circle cx="55" cy="96" r="4" fill="#6b7280" />
    <circle cx="115" cy="96" r="16" fill="#1f2937" />
    <circle cx="115" cy="96" r="9" fill="#374151" />
    <circle cx="115" cy="96" r="4" fill="#6b7280" />
    <circle cx="155" cy="96" r="16" fill="#1f2937" />
    <circle cx="155" cy="96" r="9" fill="#374151" />
    <circle cx="155" cy="96" r="4" fill="#6b7280" />
    <ellipse cx="100" cy="114" rx="95" ry="5" fill="#00000015" />
  </svg>
);

// jedna karta vozidla v zozname

function VehicleCard({ vehicle, onClick }) {
  const speed     = Number(vehicle.speed);
  const odometer = vehicle.km
    ? Number(vehicle.km).toLocaleString('sk-SK')
    : vehicle.odometerKm
    ? Number(vehicle.odometerKm).toLocaleString('sk-SK')
    : '—';

  return (
    <div
      onClick={onClick}
      className="card vehicle-card"
      style={{
        cursor: 'pointer', padding: 0, overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        border: `2px solid ${vehicle.is_own ? '#16a34a' : speed > 0 ? '#2563eb' : '#e5e7eb'}`,
        boxShadow: vehicle.is_own ? '0 0 0 2px #bbf7d0' : undefined,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{
        background: speed > 0 ? 'linear-gradient(135deg,#dbeafe,#eff6ff)' : 'linear-gradient(135deg,#f3f4f6,#f9fafb)',
        height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{ width: '180px', height: '100px' }}><TruckIcon /></div>
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.35rem' }}>
          {vehicle.is_own && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: '#16a34a', color: 'white',
              borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 600,
            }}>
              ★ Moje vozidlo
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: speed > 0 ? '#2563eb' : '#e5e7eb',
            color: speed > 0 ? 'white' : '#6b7280',
            borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 600,
          }}>
            {speed > 0 && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
            {speed > 0 ? 'V pohybe' : 'Stojí'}
          </span>
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.75rem', letterSpacing: '0.02em' }}>
          {vehicle.identifikator || vehicle.carid}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vodič</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: vehicle.driver ? 'var(--gray-800)' : 'var(--gray-400)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vehicle.driver || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Odometer</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)' }}>{odometer} km</span>
          </div>
        </div>
        {(vehicle.Location_city || vehicle.Location_street) && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-100)', fontSize: '0.82rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
            <span style={{ flexShrink: 0 }}>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[vehicle.Location_city, vehicle.Location_state].filter(Boolean).join(', ')}
              {vehicle.Location_street ? ` · ${vehicle.Location_street}` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// male pomocne komponenty pouzite vsade

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>{title}</div>
      {children}
    </div>
  );
}
function Grid2({ children }) {
  return <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', marginBottom: '0.75rem' }}>{children}</div>;
}
function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{value || '—'}</div>
    </div>
  );
}
function FG({ label, children }) {
  return <div className="form-group" style={{ marginBottom: '0.5rem' }}><label style={{ fontSize: '0.8rem' }}>{label}</label>{children}</div>;
}
function SaveActions({ onCancel, saving }) {
  return (
    <div className="modal-actions" style={{ paddingTop: '0.5rem' }}>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Späť</button>
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Ukladám...' : 'Uložiť zmeny'}</button>
    </div>
  );
}
function ExpiryBadge({ date, dni }) {
  const color = dni < 0 ? '#dc2626' : dni < 30 ? '#d97706' : dni < 90 ? '#ca8a04' : '#16a34a';
  const label = dni < 0 ? 'Expirované' : dni < 30 ? `${dni} dní` : new Date(date).toLocaleDateString('sk-SK');
  return (
    <span style={{ color, fontWeight: 600, fontSize: '0.85rem' }}>
      {new Date(date).toLocaleDateString('sk-SK')}
      {dni < 90 && <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', background: color + '20', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{label}</span>}
    </span>
  );
}

const TYP_VOZIDLA  = { tahac: 'Ťahač', privesny: 'Príves', dodavka: 'Dodávka', osobne: 'Osobné', ine: 'Iné' };
const TYP_DEADLINE = { stk: 'STK', ek: 'Emisná kontrola', poistenie: 'Poistenie', tachograf: 'Tachograf', dalsie: 'Iné' };
const TYP_DOC      = { tp_naves: 'Technický preukaz návesu', tp_tahac: 'Technický preukaz ťahača', stk: 'STK', poistka: 'Poistka', ine: 'Iné' };
const TYP_SERVIS   = { oprava: 'Oprava', udrzba: 'Údržba', pneu: 'Pneumatiky', olej: 'Výmena oleja', brzdy: 'Brzdy', ine: 'Iné' };

const STAVY = {
  dobry:        { label: 'Dobrý',       color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  upozornujuci: { label: 'Upozornenie', color: '#d97706', bg: '#fef9c3', border: '#fde68a' },
  expirovany:   { label: 'Expirovaný',  color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  v_rieseni:    { label: 'V riešení',   color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
};

function StavSelect({ stav, stavManual, onChangeStav, canEdit }) {
  const info = STAVY[stav] || STAVY.dobry;
  if (!canEdit) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600, background: info.bg, color: info.color, border: `1px solid ${info.border}` }}>
        {info.label}
        {stavManual && <span title="Manuálne nastavené" style={{ fontSize: '0.65rem', opacity: 0.7 }}>✎</span>}
      </span>
    );
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <select
        value={stav}
        onChange={e => onChangeStav(e.target.value)}
        style={{
          fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.45rem',
          borderRadius: '10px', border: `1px solid ${info.border}`,
          background: info.bg, color: info.color, cursor: 'pointer', outline: 'none',
        }}
      >
        {Object.entries(STAVY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {stavManual && (
        <button onClick={() => onChangeStav('auto')} title="Resetovať na automatický stav" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.75rem', padding: '0.1rem 0.25rem', lineHeight: 1 }}>↺</button>
      )}
    </div>
  );
}

// modal s tabmi: info / terminy / servis / dokumenty

function VehicleModal({ vehicle, trailers = [], onClose }) {
  const { user: currentUser } = useAuth();
  const canEdit = ['admin', 'dispecer', 'manazer'].includes(currentUser?.rola);
  const isAdmin = currentUser?.rola === 'admin';
  const isVodic = currentUser?.rola === 'vodic';

  const spz        = vehicle.identifikator || vehicle.carid;
  const speed      = Number(vehicle.speed);
  const isMoving   = speed > 0;
  const accent     = '#2563eb';
  const accentLight = '#dbeafe';
  const accentBorder = '#bfdbfe';
  const odometer = vehicle.km
    ? Number(vehicle.km).toLocaleString('sk-SK')
    : vehicle.odometerKm
    ? Number(vehicle.odometerKm).toLocaleString('sk-SK')
    : '—';

  const [tab, setTab]   = useState('info');   // info | deadlines | service | docs
  const [mode, setMode] = useState('view');   // view | edit

  const [details, setDetails]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [deadlines, setDeadlines] = useState([]);
  const [docs, setDocs]           = useState([]);
  const [service, setService]     = useState([]);

  // Servis
  const [showAddSv, setShowAddSv] = useState(false);
  const emptySvForm = { typ_ukonu: 'udrzba', popis: '', datum_ukonu: '', cena: '', stav_odometra_pri_servise: '', poznamka: '' };
  const [svForm, setSvForm]       = useState(emptySvForm);
  const [svSaving, setSvSaving]   = useState(false);
  const [editSvId, setEditSvId]   = useState(null);
  const [editSvForm, setEditSvForm] = useState({});

  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Termíny
  const [showAddDl, setShowAddDl] = useState(false);
  const [dlForm, setDlForm]       = useState({ typ: 'stk', datum_expiracie: '', poznamka: '' });
  const [dlSaving, setDlSaving]   = useState(false);
  const [editDlId, setEditDlId]   = useState(null);   // id termínu v editácii
  const [editDlForm, setEditDlForm] = useState({});

  // Dokumenty
  const [showUpload, setShowUpload] = useState(false);
  const [upForm, setUpForm]         = useState({ nazov: '', typ_dokumentu: 'ine' });
  const [uploading, setUploading]   = useState(false);
  const fileRef = useRef(null);

  // CMR pre toto vozidlo
  const [cmrList, setCmrList]       = useState([]);
  const [showAddCmr, setShowAddCmr] = useState(false);
  const [cmrForm, setCmrForm]       = useState({
    cislo_cmr: '', datum_prepravy: new Date().toISOString().slice(0, 10), poznamka: '',
  });
  const [cmrUploading, setCmrUploading] = useState(false);
  const cmrFileRef = useRef(null);

  const BASE = `/vehicle-details/${encodeURIComponent(spz)}`;

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get(BASE),
      api.get(`${BASE}/deadlines`),
      api.get(`${BASE}/documents`),
      api.get(`${BASE}/service`),
    ]).then(([detRes, dlRes, docRes, svRes]) => {
      setDetails(detRes.data.details || {});
      setForm(detRes.data.details || {});
      setDeadlines(dlRes.data);
      setDocs(docRes.data);
      setService(svRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [spz]);

  // CMR sa lazy-loaduje az pri otvoreni tabu
  useEffect(() => {
    if (tab !== 'cmr') return;
    api.get('/cmr', { params: { ecv: spz } })
      .then(r => setCmrList(r.data))
      .catch(() => {});
  }, [tab, spz]);

  const cmrCanUpload = isVodic || isAdmin;

  const handleAddCmr = async (e) => {
    e.preventDefault();
    setError('');
    if (!cmrFileRef.current?.files[0]) { setError('Vyber súbor'); return; }
    const data = new FormData();
    data.append('file', cmrFileRef.current.files[0]);
    data.append('ecv', spz);
    data.append('cislo_cmr', cmrForm.cislo_cmr);
    data.append('datum_prepravy', cmrForm.datum_prepravy);
    data.append('poznamka', cmrForm.poznamka);

    setCmrUploading(true);
    try {
      await api.post('/cmr', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowAddCmr(false);
      setCmrForm({ cislo_cmr: '', datum_prepravy: new Date().toISOString().slice(0, 10), poznamka: '' });
      api.get('/cmr', { params: { ecv: spz } }).then(r => setCmrList(r.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri nahrávaní');
    } finally { setCmrUploading(false); }
  };

  const handleDownloadCmr = async (cmrId, nazov) => {
    try {
      const res = await api.get(`/cmr/${cmrId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = nazov; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleDeleteCmr = async (cmrId) => {
    if (!window.confirm('Zmazať tento CMR?')) return;
    try {
      await api.delete(`/cmr/${cmrId}`);
      setCmrList(l => l.filter(c => c.id !== cmrId));
    } catch {}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const res = await api.put(BASE, form);
      setDetails(res.data.details || {});
      setForm(res.data.details || {});
      setSuccess('Zmeny uložené');
      setMode('view');
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri ukladaní');
    } finally { setSaving(false); }
  };

  const handleAddDeadline = async (e) => {
    e.preventDefault();
    setError('');
    setDlSaving(true);
    try {
      await api.post(`${BASE}/deadlines`, dlForm);
      setShowAddDl(false);
      setDlForm({ typ: 'stk', datum_expiracie: '', poznamka: '' });
      api.get(`${BASE}/deadlines`).then(r => setDeadlines(r.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri pridávaní');
    } finally { setDlSaving(false); }
  };

  const handleEditDeadline = (dl) => {
    setEditDlId(dl.id);
    setEditDlForm({ typ: dl.typ, datum_expiracie: dl.datum_expiracie, poznamka: dl.poznamka || '' });
    setShowAddDl(false);
  };

  const handleChangeStav = async (dlId, newStav) => {
    try {
      const res = await api.patch(`${BASE}/deadlines/${dlId}`, { stav: newStav });
      setDeadlines(dls => dls.map(d => d.id === dlId ? { ...d, stav: res.data.stav, stav_manual: res.data.stav_manual } : d));
    } catch {}
  };

  const handleSaveDeadline = async (e) => {
    e.preventDefault();
    setError('');
    setDlSaving(true);
    try {
      await api.put(`${BASE}/deadlines/${editDlId}`, editDlForm);
      setEditDlId(null);
      api.get(`${BASE}/deadlines`).then(r => setDeadlines(r.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri ukladaní');
    } finally { setDlSaving(false); }
  };

  const handleDeleteDeadline = async (dlId) => {
    if (!window.confirm('Zmazať termín?')) return;
    try {
      await api.delete(`${BASE}/deadlines/${dlId}`);
      setDeadlines(dl => dl.filter(d => d.id !== dlId));
    } catch {}
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setError('');
    setSvSaving(true);
    try {
      await api.post(`${BASE}/service`, svForm);
      setShowAddSv(false);
      setSvForm(emptySvForm);
      api.get(`${BASE}/service`).then(r => setService(r.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri pridávaní');
    } finally { setSvSaving(false); }
  };

  const handleEditService = (sv) => {
    setEditSvId(sv.id);
    setEditSvForm({
      typ_ukonu: sv.typ_ukonu || 'ine',
      popis: sv.popis || '',
      datum_ukonu: sv.datum_ukonu || '',
      cena: sv.cena || '',
      stav_odometra_pri_servise: sv.stav_odometra_pri_servise || '',
      poznamka: sv.poznamka || '',
    });
    setShowAddSv(false);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setError('');
    setSvSaving(true);
    try {
      await api.put(`${BASE}/service/${editSvId}`, editSvForm);
      setEditSvId(null);
      api.get(`${BASE}/service`).then(r => setService(r.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri ukladaní');
    } finally { setSvSaving(false); }
  };

  const handleDeleteService = async (svId) => {
    if (!window.confirm('Zmazať servisný záznam?')) return;
    try {
      await api.delete(`${BASE}/service/${svId}`);
      setService(s => s.filter(x => x.id !== svId));
    } catch {}
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileRef.current?.files[0]) return;
    const data = new FormData();
    data.append('file', fileRef.current.files[0]);
    data.append('nazov', upForm.nazov || fileRef.current.files[0].name);
    data.append('typ_dokumentu', upForm.typ_dokumentu);
    setUploading(true);
    try {
      await api.post(`${BASE}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false);
      setUpForm({ nazov: '', typ_dokumentu: 'ine' });
      api.get(`${BASE}/documents`).then(r => setDocs(r.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri nahrávaní');
    } finally { setUploading(false); }
  };

  const handleDownloadDoc = async (docId, nazov) => {
    try {
      const res = await api.get(`${BASE}/documents/${docId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = nazov; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Nepodarilo sa stiahnuť dokument'); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Zmazať dokument?')) return;
    try {
      await api.delete(`${BASE}/documents/${docId}`);
      setDocs(d => d.filter(doc => doc.id !== docId));
    } catch {}
  };

  const tabStyle = active => ({
    padding: '0.5rem 1rem', border: 'none',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    background: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400,
    color: active ? 'var(--primary)' : 'var(--gray-500)', fontSize: '0.9rem',
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '680px', width: '100%', padding: 0, overflow: 'hidden' }}>

        {/* Hlavička */}
        <div style={{ background: isMoving ? `linear-gradient(135deg,${accentLight},#f9fafb)` : 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: isMoving ? accentLight : '#e5e7eb',
              border: `3px solid ${isMoving ? accent : '#d1d5db'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px',
            }}>
              <TruckIcon />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '0.05em' }}>
                {spz}
                {(details.znacka || details.model) && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', fontWeight: 400, color: 'var(--gray-500)' }}>
                    {details.znacka} {details.model}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: isMoving ? accent : '#e5e7eb',
                  color: isMoving ? 'white' : '#6b7280',
                  borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 600,
                }}>
                  {isMoving && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
                  {isMoving ? 'V pohybe' : 'Stojí'}
                </span>
                {isMoving && (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: accent, background: 'white', padding: '0.15rem 0.55rem', borderRadius: '6px', border: `1px solid ${accentBorder}` }}>
                    {speed} km/h
                  </span>
                )}
              </div>
            </div>

            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, flexShrink: 0, padding: '0.25rem' }}>×</button>
          </div>

          <div style={{ display: 'flex', gap: '0.25rem', paddingLeft: '1.5rem' }}>
            {(isVodic
              ? [['info','Informácie'],['docs','Dokumenty'],['cmr','CMR']]
              : [['info','Informácie'],['deadlines','Termíny'],['service','Servis'],['docs','Dokumenty'],['cmr','CMR']]
            ).map(([k,l]) => (
              <button key={k} style={tabStyle(tab === k)} onClick={() => { setTab(k); setMode('view'); setError(''); setSuccess(''); }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Obsah */}
        <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

          {loading ? <div style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Načítavam...</div> : (
            <>
              {/* tab: info */}
              {tab === 'info' && mode === 'view' && (
                <>
                  <Section title="Z Webdispečink">
                    <Grid2>
                      <InfoRow label="Vodič"    value={vehicle.driver} />
                      <InfoRow label="Rýchlosť" value={speed > 0 ? `${speed} km/h` : 'Stojí'} />
                      <InfoRow label="Odometer" value={`${odometer} km`} />
                    </Grid2>
                    {(vehicle.Location_city || vehicle.Location_street || vehicle.latitude) && (() => {
                      const hasCoords = vehicle.latitude && vehicle.longitude;
                      const mapsUrl = hasCoords
                        ? `https://www.google.com/maps?q=${vehicle.latitude},${vehicle.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([vehicle.Location_street, vehicle.Location_city, vehicle.Location_state].filter(Boolean).join(', '))}`;
                      const addressText = [vehicle.Location_city, vehicle.Location_state].filter(Boolean).join(', ') +
                        (vehicle.Location_street ? ` · ${vehicle.Location_street}` : '');
                      return (
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Poloha</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{addressText}</span>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--primary)', background: '#eff6ff', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #bfdbfe', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                              📍 Otvoriť mapu
                            </a>
                          </div>
                        </div>
                      );
                    })()}
                  </Section>

                  <Section title="Evidencia">
                    <Grid2>
                      <InfoRow label="Značka"     value={details.znacka} />
                      <InfoRow label="Model"      value={details.model} />
                      <InfoRow label="Rok výroby" value={details.rok_vyroby} />
                      <InfoRow label="Typ"        value={TYP_VOZIDLA[details.typ_vozidla] || details.typ_vozidla} />
                      <InfoRow label="VIN"        value={details.vin} />
                    </Grid2>
                    {details.poznamka && <InfoRow label="Poznámka" value={details.poznamka} />}
                  </Section>

                  {details.naves_ecv && (
                    <Section title="Priradený náves">
                      {(() => {
                        const trailer = trailers.find(t => t.identifikator === details.naves_ecv);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                            <div style={{ width: 40, height: 24, flexShrink: 0 }}><TruckIcon /></div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: '#2563eb' }}>{details.naves_ecv}</div>
                              {trailer && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.1rem' }}>
                                  {Number(trailer.speed) > 0
                                    ? <span style={{ color: '#2563eb' }}>▶ V pohybe · {trailer.speed} km/h</span>
                                    : 'Stojí'}
                                  {trailer.Location_city && <span> · {trailer.Location_city}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </Section>
                  )}
                </>
              )}

              {tab === 'info' && mode === 'edit' && (
                <form onSubmit={handleSave}>
                  <Section title="Evidencia">
                    <Grid2>
                      <FG label="Značka"><input value={form.znacka || ''} onChange={e => setForm(f => ({ ...f, znacka: e.target.value }))} /></FG>
                      <FG label="Model"><input value={form.model || ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></FG>
                      <FG label="Rok výroby"><input type="number" value={form.rok_vyroby || ''} onChange={e => setForm(f => ({ ...f, rok_vyroby: e.target.value }))} min={1980} max={2030} /></FG>
                      <FG label="Typ">
                        <select value={form.typ_vozidla || 'tahac'} onChange={e => setForm(f => ({ ...f, typ_vozidla: e.target.value }))}>
                          {Object.entries(TYP_VOZIDLA).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </FG>
                      <FG label="VIN"><input value={form.vin || ''} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} /></FG>
                    </Grid2>
                    <FG label="Poznámka"><textarea value={form.poznamka || ''} onChange={e => setForm(f => ({ ...f, poznamka: e.target.value }))} rows={2} style={{ resize: 'vertical' }} /></FG>
                  </Section>
                  {trailers.filter(t => (t.identifikator || t.carid) !== spz).length > 0 && (
                    <Section title="Priradený náves">
                      <FG label="Priradený náves">
                        <select value={form.naves_ecv || ''} onChange={e => setForm(f => ({ ...f, naves_ecv: e.target.value }))}>
                          <option value="">— žiadny —</option>
                          {trailers
                            .filter(t => (t.identifikator || t.carid) !== spz)
                            .map(t => (
                              <option key={t.carid} value={t.identifikator || t.carid}>{t.identifikator || t.carid}</option>
                            ))}
                        </select>
                      </FG>
                    </Section>
                  )}
                  <SaveActions onCancel={() => setMode('view')} saving={saving} />
                </form>
              )}

              {/* tab: terminy */}
              {tab === 'deadlines' && (
                <>
                  {deadlines.length === 0 && !showAddDl && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Žiadne termíny</div>
                  )}
                  {deadlines.map(dl => (
                    <div key={dl.id} style={{ marginBottom: '0.5rem' }}>
                      {editDlId === dl.id ? (
                        <form onSubmit={handleSaveDeadline} style={{ background: '#eff6ff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                          <Grid2>
                            <FG label="Typ">
                              <select value={editDlForm.typ} onChange={e => setEditDlForm(f => ({ ...f, typ: e.target.value }))}>
                                {Object.entries(TYP_DEADLINE).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </FG>
                            <FG label="Dátum expirácie">
                              <input type="date" value={editDlForm.datum_expiracie} onChange={e => setEditDlForm(f => ({ ...f, datum_expiracie: e.target.value }))} required />
                            </FG>
                          </Grid2>
                          <FG label="Poznámka (voliteľné)">
                            <input value={editDlForm.poznamka} onChange={e => setEditDlForm(f => ({ ...f, poznamka: e.target.value }))} />
                          </FG>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditDlId(null)}>Zrušiť</button>
                            <button type="submit" className="btn btn-primary" disabled={dlSaving}>{dlSaving ? 'Ukladám...' : 'Uložiť'}</button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dl.typ_label}</div>
                            <div style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                              <ExpiryBadge date={dl.datum_expiracie} dni={dl.dni} />
                              {dl.poznamka && <span style={{ color: 'var(--gray-400)', marginLeft: '0.5rem' }}>· {dl.poznamka}</span>}
                            </div>
                          </div>
                          <StavSelect stav={dl.stav || 'dobry'} stavManual={dl.stav_manual} canEdit={canEdit} onChangeStav={v => handleChangeStav(dl.id, v)} />
                          {canEdit && (
                            <button onClick={() => handleEditDeadline(dl)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Upraviť</button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDeleteDeadline(dl.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {showAddDl && (
                    <form onSubmit={handleAddDeadline} style={{ marginTop: '1rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <Grid2>
                        <FG label="Typ">
                          <select value={dlForm.typ} onChange={e => setDlForm(f => ({ ...f, typ: e.target.value }))}>
                            {Object.entries(TYP_DEADLINE).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </FG>
                        <FG label="Dátum expirácie">
                          <input type="date" value={dlForm.datum_expiracie} onChange={e => setDlForm(f => ({ ...f, datum_expiracie: e.target.value }))} required />
                        </FG>
                      </Grid2>
                      <FG label="Poznámka (voliteľné)">
                        <input value={dlForm.poznamka} onChange={e => setDlForm(f => ({ ...f, poznamka: e.target.value }))} />
                      </FG>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddDl(false)}>Zrušiť</button>
                        <button type="submit" className="btn btn-primary" disabled={dlSaving}>{dlSaving ? 'Pridávam...' : 'Pridať'}</button>
                      </div>
                    </form>
                  )}
                  {canEdit && !showAddDl && (
                    <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setShowAddDl(true)}>+ Pridať termín</button>
                  )}
                </>
              )}

              {/* tab: servis */}
              {tab === 'service' && (
                <>
                  {service.length === 0 && !showAddSv && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Žiadne servisné záznamy</div>
                  )}
                  {service.map(sv => (
                    <div key={sv.id} style={{ marginBottom: '0.5rem' }}>
                      {editSvId === sv.id ? (
                        <form onSubmit={handleSaveService} style={{ background: '#eff6ff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                          <Grid2>
                            <FG label="Typ úkonu">
                              <select value={editSvForm.typ_ukonu} onChange={e => setEditSvForm(f => ({ ...f, typ_ukonu: e.target.value }))}>
                                {Object.entries(TYP_SERVIS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </FG>
                            <FG label="Dátum úkonu">
                              <input type="date" value={editSvForm.datum_ukonu} onChange={e => setEditSvForm(f => ({ ...f, datum_ukonu: e.target.value }))} required />
                            </FG>
                          </Grid2>
                          <FG label="Popis *">
                            <input value={editSvForm.popis} onChange={e => setEditSvForm(f => ({ ...f, popis: e.target.value }))} required />
                          </FG>
                          <Grid2>
                            <FG label="Cena (€)">
                              <input type="number" step="0.01" value={editSvForm.cena} onChange={e => setEditSvForm(f => ({ ...f, cena: e.target.value }))} />
                            </FG>
                            <FG label="Stav odometra (km)">
                              <input type="number" value={editSvForm.stav_odometra_pri_servise} onChange={e => setEditSvForm(f => ({ ...f, stav_odometra_pri_servise: e.target.value }))} />
                            </FG>
                          </Grid2>
                          <FG label="Poznámka">
                            <input value={editSvForm.poznamka} onChange={e => setEditSvForm(f => ({ ...f, poznamka: e.target.value }))} />
                          </FG>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditSvId(null)}>Zrušiť</button>
                            <button type="submit" className="btn btn-primary" disabled={svSaving}>{svSaving ? 'Ukladám...' : 'Uložiť'}</button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {TYP_SERVIS[sv.typ_ukonu] || sv.typ_ukonu}
                              <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--gray-500)' }}>· {sv.datum_ukonu}</span>
                            </div>
                            <div style={{ fontSize: '0.82rem', marginTop: '0.15rem', color: 'var(--gray-600)' }}>{sv.popis}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.15rem' }}>
                              {sv.cena != null && sv.cena !== '' && <span>{Number(sv.cena).toFixed(2)} €</span>}
                              {sv.stav_odometra_pri_servise && <span style={{ marginLeft: '0.5rem' }}>· {Number(sv.stav_odometra_pri_servise).toLocaleString('sk-SK')} km</span>}
                              {sv.poznamka && <span style={{ marginLeft: '0.5rem' }}>· {sv.poznamka}</span>}
                            </div>
                          </div>
                          {canEdit && (
                            <button onClick={() => handleEditService(sv)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Upraviť</button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDeleteService(sv.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {showAddSv && (
                    <form onSubmit={handleAddService} style={{ marginTop: '1rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <Grid2>
                        <FG label="Typ úkonu">
                          <select value={svForm.typ_ukonu} onChange={e => setSvForm(f => ({ ...f, typ_ukonu: e.target.value }))}>
                            {Object.entries(TYP_SERVIS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </FG>
                        <FG label="Dátum úkonu *">
                          <input type="date" value={svForm.datum_ukonu} onChange={e => setSvForm(f => ({ ...f, datum_ukonu: e.target.value }))} required />
                        </FG>
                      </Grid2>
                      <FG label="Popis *">
                        <input value={svForm.popis} onChange={e => setSvForm(f => ({ ...f, popis: e.target.value }))} required placeholder="napr. Výmena brzdových doštičiek" />
                      </FG>
                      <Grid2>
                        <FG label="Cena (€)">
                          <input type="number" step="0.01" value={svForm.cena} onChange={e => setSvForm(f => ({ ...f, cena: e.target.value }))} />
                        </FG>
                        <FG label="Stav odometra (km)">
                          <input type="number" value={svForm.stav_odometra_pri_servise} onChange={e => setSvForm(f => ({ ...f, stav_odometra_pri_servise: e.target.value }))} />
                        </FG>
                      </Grid2>
                      <FG label="Poznámka (voliteľné)">
                        <input value={svForm.poznamka} onChange={e => setSvForm(f => ({ ...f, poznamka: e.target.value }))} />
                      </FG>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddSv(false)}>Zrušiť</button>
                        <button type="submit" className="btn btn-primary" disabled={svSaving}>{svSaving ? 'Pridávam...' : 'Pridať'}</button>
                      </div>
                    </form>
                  )}
                  {canEdit && !showAddSv && (
                    <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setShowAddSv(true)}>+ Pridať servisný záznam</button>
                  )}
                </>
              )}

              {/* tab: dokumenty */}
              {tab === 'docs' && (
                <>
                  {docs.length === 0 && !showUpload && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Žiadne dokumenty</div>
                  )}
                  {docs.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.nazov}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: '0.1rem' }}>
                          {TYP_DOC[doc.typ_dokumentu] || doc.typ_dokumentu} · {(doc.velkost / 1024).toFixed(0)} KB
                        </div>
                      </div>
                      <button onClick={() => handleDownloadDoc(doc.id, doc.nazov)}
                        style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', padding: '0.3rem 0.6rem', border: '1px solid var(--primary)', borderRadius: '6px', cursor: 'pointer' }}>
                        Stiahnuť
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                      )}
                    </div>
                  ))}

                  {showUpload && (
                    <form onSubmit={handleUpload} style={{ marginTop: '1rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <FG label="Typ dokumentu">
                        <select value={upForm.typ_dokumentu} onChange={e => setUpForm(f => ({ ...f, typ_dokumentu: e.target.value }))}>
                          {Object.entries(TYP_DOC).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </FG>
                      <FG label="Názov (voliteľné)">
                        <input value={upForm.nazov} onChange={e => setUpForm(f => ({ ...f, nazov: e.target.value }))} placeholder="Nechajte prázdne pre názov súboru" />
                      </FG>
                      <FG label="Súbor (PDF, JPG, PNG — max. 10 MB)">
                        <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png,.webp" required />
                      </FG>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>Zrušiť</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Nahrávam...' : 'Nahrať'}</button>
                      </div>
                    </form>
                  )}
                  {canEdit && !showUpload && (
                    <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setShowUpload(true)}>+ Pridať dokument</button>
                  )}
                </>
              )}

              {/* tab: cmr */}
              {tab === 'cmr' && (
                <>
                  {cmrList.length === 0 && !showAddCmr && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Žiadne CMR pre toto vozidlo</div>
                  )}
                  {cmrList.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {c.cislo_cmr || c.nazov}
                          {c.datum_prepravy && (
                            <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--gray-500)' }}>
                              · {new Date(c.datum_prepravy).toLocaleDateString('sk-SK')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: '0.15rem' }}>
                          {c.nahral_meno ? `${c.nahral_meno} ${c.nahral_priezvisko}` : '—'}
                          {c.poznamka && <span> · {c.poznamka}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadCmr(c.id, c.nazov)}
                        style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', padding: '0.3rem 0.6rem', border: '1px solid var(--primary)', borderRadius: '6px', cursor: 'pointer' }}
                      >Stiahnuť</button>
                      {isAdmin && (
                        <button onClick={() => handleDeleteCmr(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                      )}
                    </div>
                  ))}

                  {showAddCmr && (
                    <form onSubmit={handleAddCmr} style={{ marginTop: '1rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
                        Vozidlo: <strong>{spz}</strong>
                      </div>
                      <Grid2>
                        <FG label="Číslo CMR">
                          <input value={cmrForm.cislo_cmr} onChange={e => setCmrForm(f => ({ ...f, cislo_cmr: e.target.value }))} placeholder="napr. SK-2026-0042" />
                        </FG>
                        <FG label="Dátum prepravy">
                          <input type="date" value={cmrForm.datum_prepravy} onChange={e => setCmrForm(f => ({ ...f, datum_prepravy: e.target.value }))} />
                        </FG>
                      </Grid2>
                      <FG label="Poznámka">
                        <input value={cmrForm.poznamka} onChange={e => setCmrForm(f => ({ ...f, poznamka: e.target.value }))} placeholder="napr. nakládka BA → vykládka Wien" />
                      </FG>
                      <FG label="Súbor (PDF / JPG / PNG, max 10 MB) *">
                        <input type="file" ref={cmrFileRef} accept=".pdf,.jpg,.jpeg,.png,.webp" required />
                      </FG>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddCmr(false)}>Zrušiť</button>
                        <button type="submit" className="btn btn-primary" disabled={cmrUploading}>{cmrUploading ? 'Nahrávam...' : 'Nahrať CMR'}</button>
                      </div>
                    </form>
                  )}
                  {cmrCanUpload && !showAddCmr && (
                    <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setShowAddCmr(true)}>+ Nahrať CMR</button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {mode === 'view' && tab === 'info' && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Zavrieť</button>
            {canEdit && <button className="btn btn-primary" onClick={() => setMode('edit')}>Upraviť</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// karta navesu (fialova varianta)

function TrailerCard({ trailer, onClick }) {
  return (
    <div
      onClick={onClick}
      className="card vehicle-card"
      style={{
        cursor: 'pointer', padding: 0, overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        border: '2px solid #e5e7eb',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: '180px', height: '100px' }}><TrailerIcon /></div>
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#ede9fe', color: '#7c3aed', borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 600 }}>
            Náves
          </span>
        </div>
      </div>
      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.75rem', letterSpacing: '0.02em' }}>
          {trailer.ecv}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Značka / Model</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: trailer.znacka ? 'var(--gray-800)' : 'var(--gray-400)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {trailer.znacka && trailer.model ? `${trailer.znacka} ${trailer.model}` : trailer.znacka || trailer.model || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rok výroby</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)' }}>{trailer.rok_vyroby || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// modal pre naves - podobny ako VehicleModal len bez WD veci

function TrailerModal({ trailer, onClose, onSaved, onDeleted }) {
  const { user: currentUser } = useAuth();
  const canEdit = ['admin', 'dispecer', 'manazer'].includes(currentUser?.rola);
  const isAdmin = currentUser?.rola === 'admin';

  const isCreate = !trailer;
  const [tab, setTab]   = useState('info');
  const [mode, setMode] = useState(isCreate ? 'create' : 'view');

  const emptyForm = { ecv: '', znacka: '', model: '', rok_vyroby: '', vin: '', poznamka: '' };
  const [form, setForm]     = useState(isCreate ? emptyForm : {
    ecv: trailer.ecv, znacka: trailer.znacka || '', model: trailer.model || '',
    rok_vyroby: trailer.rok_vyroby || '', vin: trailer.vin || '', poznamka: trailer.poznamka || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const BASE = trailer ? `/vehicle-details/${encodeURIComponent(trailer.ecv)}` : null;

  // Deadlines
  const [deadlines, setDeadlines]   = useState([]);
  const [dlLoading, setDlLoading]   = useState(false);
  const [showAddDl, setShowAddDl]   = useState(false);
  const [dlForm, setDlForm]         = useState({ typ: 'stk', datum_expiracie: '', poznamka: '' });
  const [dlSaving, setDlSaving]     = useState(false);
  const [editDlId, setEditDlId]     = useState(null);
  const [editDlForm, setEditDlForm] = useState({});

  // Dokumenty
  const [docs, setDocs]             = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [upForm, setUpForm]         = useState({ nazov: '', typ_dokumentu: 'ine' });
  const [uploading, setUploading]   = useState(false);
  const fileRef = useRef(null);

  // Servis
  const [service, setService]       = useState([]);
  const [showAddSv, setShowAddSv]   = useState(false);
  const emptySvForm = { typ_ukonu: 'udrzba', popis: '', datum_ukonu: '', cena: '', stav_odometra_pri_servise: '', poznamka: '' };
  const [svForm, setSvForm]         = useState(emptySvForm);
  const [svSaving, setSvSaving]     = useState(false);
  const [editSvId, setEditSvId]     = useState(null);
  const [editSvForm, setEditSvForm] = useState({});

  useEffect(() => {
    if (!BASE) return;
    setDlLoading(true);
    Promise.all([api.get(`${BASE}/deadlines`), api.get(`${BASE}/documents`), api.get(`${BASE}/service`)])
      .then(([dl, dc, sv]) => { setDeadlines(dl.data); setDocs(dc.data); setService(sv.data); })
      .catch(() => {})
      .finally(() => setDlLoading(false));
  }, [BASE]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    setSaving(true);
    try {
      const res = await api.post('/trailers', form);
      onSaved(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Chyba pri ukladaní'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    setSaving(true);
    try {
      const res = await api.put(`/trailers/${encodeURIComponent(trailer.ecv)}`, form);
      setSuccess('Zmeny uložené'); setMode('view');
      onSaved(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Chyba pri ukladaní'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Zmazať náves ${trailer.ecv}?`)) return;
    try {
      await api.delete(`/trailers/${encodeURIComponent(trailer.ecv)}`);
      onDeleted(trailer.ecv);
    } catch (err) { setError(err.response?.data?.error || 'Chyba pri mazaní'); }
  };

  const handleAddDeadline = async (e) => {
    e.preventDefault(); setError(''); setDlSaving(true);
    try {
      await api.post(`${BASE}/deadlines`, dlForm);
      setShowAddDl(false); setDlForm({ typ: 'stk', datum_expiracie: '', poznamka: '' });
      api.get(`${BASE}/deadlines`).then(r => setDeadlines(r.data));
    } catch (err) { setError(err.response?.data?.error || 'Chyba'); }
    finally { setDlSaving(false); }
  };

  const handleSaveDeadline = async (e) => {
    e.preventDefault(); setError(''); setDlSaving(true);
    try {
      await api.put(`${BASE}/deadlines/${editDlId}`, editDlForm);
      setEditDlId(null);
      api.get(`${BASE}/deadlines`).then(r => setDeadlines(r.data));
    } catch (err) { setError(err.response?.data?.error || 'Chyba'); }
    finally { setDlSaving(false); }
  };

  const handleDeleteDeadline = async (dlId) => {
    if (!window.confirm('Zmazať termín?')) return;
    try {
      await api.delete(`${BASE}/deadlines/${dlId}`);
      setDeadlines(dl => dl.filter(d => d.id !== dlId));
    } catch {}
  };

  const handleAddService = async (e) => {
    e.preventDefault(); setError(''); setSvSaving(true);
    try {
      await api.post(`${BASE}/service`, svForm);
      setShowAddSv(false); setSvForm(emptySvForm);
      api.get(`${BASE}/service`).then(r => setService(r.data));
    } catch (err) { setError(err.response?.data?.error || 'Chyba'); }
    finally { setSvSaving(false); }
  };

  const handleEditService = (sv) => {
    setEditSvId(sv.id);
    setEditSvForm({
      typ_ukonu: sv.typ_ukonu || 'ine',
      popis: sv.popis || '',
      datum_ukonu: sv.datum_ukonu || '',
      cena: sv.cena || '',
      stav_odometra_pri_servise: sv.stav_odometra_pri_servise || '',
      poznamka: sv.poznamka || '',
    });
    setShowAddSv(false);
  };

  const handleSaveService = async (e) => {
    e.preventDefault(); setError(''); setSvSaving(true);
    try {
      await api.put(`${BASE}/service/${editSvId}`, editSvForm);
      setEditSvId(null);
      api.get(`${BASE}/service`).then(r => setService(r.data));
    } catch (err) { setError(err.response?.data?.error || 'Chyba'); }
    finally { setSvSaving(false); }
  };

  const handleDeleteService = async (svId) => {
    if (!window.confirm('Zmazať servisný záznam?')) return;
    try {
      await api.delete(`${BASE}/service/${svId}`);
      setService(s => s.filter(x => x.id !== svId));
    } catch {}
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileRef.current?.files[0]) return;
    const data = new FormData();
    data.append('file', fileRef.current.files[0]);
    data.append('nazov', upForm.nazov || fileRef.current.files[0].name);
    data.append('typ_dokumentu', upForm.typ_dokumentu);
    setUploading(true);
    try {
      await api.post(`${BASE}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false); setUpForm({ nazov: '', typ_dokumentu: 'ine' });
      api.get(`${BASE}/documents`).then(r => setDocs(r.data));
    } catch (err) { setError(err.response?.data?.error || 'Chyba pri nahrávaní'); }
    finally { setUploading(false); }
  };

  const handleDownloadDoc = async (docId, nazov) => {
    try {
      const res = await api.get(`${BASE}/documents/${docId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = nazov; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Nepodarilo sa stiahnuť dokument'); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Zmazať dokument?')) return;
    try {
      await api.delete(`${BASE}/documents/${docId}`);
      setDocs(d => d.filter(doc => doc.id !== docId));
    } catch {}
  };

  const handleChangeStav = async (dlId, newStav) => {
    try {
      const res = await api.patch(`${BASE}/deadlines/${dlId}`, { stav: newStav });
      setDeadlines(dls => dls.map(d => d.id === dlId ? { ...d, stav: res.data.stav, stav_manual: res.data.stav_manual } : d));
    } catch {}
  };

  const tabStyle = active => ({
    padding: '0.5rem 1rem', border: 'none',
    borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
    background: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400,
    color: active ? '#7c3aed' : 'var(--gray-500)', fontSize: '0.9rem',
  });

  const evidenciaForm = (showEcv) => (
    <>
      {showEcv && (
        <FG label="EČV *"><input value={form.ecv} onChange={e => setForm(f => ({ ...f, ecv: e.target.value }))} required placeholder="napr. ZA123AB" /></FG>
      )}
      <Grid2>
        <FG label="Značka *"><input value={form.znacka} onChange={e => setForm(f => ({ ...f, znacka: e.target.value }))} required /></FG>
        <FG label="Model *"><input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required /></FG>
        <FG label="Rok výroby"><input type="number" value={form.rok_vyroby} onChange={e => setForm(f => ({ ...f, rok_vyroby: e.target.value }))} min={1980} max={2030} /></FG>
        <FG label="VIN"><input value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} /></FG>
      </Grid2>
      <FG label="Poznámka"><textarea value={form.poznamka} onChange={e => setForm(f => ({ ...f, poznamka: e.target.value }))} rows={2} style={{ resize: 'vertical' }} /></FG>
    </>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '620px', width: '100%', padding: 0, overflow: 'hidden' }}>

        {/* Hlavička */}
        <div style={{ background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', borderBottom: '1px solid #e9d5ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: '#f5f3ff', border: '3px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', overflow: 'hidden' }}>
              <TrailerIcon />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '0.05em' }}>
                {isCreate ? 'Nový náves' : trailer.ecv}
                {!isCreate && (trailer.znacka || trailer.model) && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', fontWeight: 400, color: 'var(--gray-500)' }}>
                    {trailer.znacka} {trailer.model}
                  </span>
                )}
              </div>
              {!isCreate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', background: '#ede9fe', color: '#7c3aed', borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, marginTop: '0.3rem' }}>
                  Náves
                </span>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, flexShrink: 0, padding: '0.25rem' }}>×</button>
          </div>

          {!isCreate && (
            <div style={{ display: 'flex', gap: '0.25rem', paddingLeft: '1.5rem' }}>
              {[['info','Informácie'],['deadlines','Termíny'],['service','Servis'],['docs','Dokumenty']].map(([k,l]) => (
                <button key={k} style={tabStyle(tab === k)} onClick={() => { setTab(k); setMode('view'); setError(''); setSuccess(''); }}>{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* Obsah */}
        <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

          {/* vytvaranie noveho navesu */}
          {isCreate && (
            <form onSubmit={handleCreate}>
              <Section title="Základné údaje">{evidenciaForm(true)}</Section>
              <SaveActions onCancel={onClose} saving={saving} />
            </form>
          )}

          {/* tab: info */}
          {!isCreate && tab === 'info' && mode === 'view' && (
            <>
              <Section title="Evidencia">
                <Grid2>
                  <InfoRow label="Značka"     value={trailer.znacka} />
                  <InfoRow label="Model"      value={trailer.model} />
                  <InfoRow label="Rok výroby" value={trailer.rok_vyroby} />
                  <InfoRow label="VIN"        value={trailer.vin} />
                </Grid2>
                {trailer.poznamka && <InfoRow label="Poznámka" value={trailer.poznamka} />}
              </Section>
            </>
          )}

          {!isCreate && tab === 'info' && mode === 'edit' && (
            <form onSubmit={handleUpdate}>
              <Section title="Evidencia">{evidenciaForm(false)}</Section>
              <SaveActions onCancel={() => setMode('view')} saving={saving} />
            </form>
          )}

          {/* tab: terminy */}
          {!isCreate && tab === 'deadlines' && (
            <>
              {dlLoading ? <div style={{ color: 'var(--gray-400)' }}>Načítavam...</div> : (
                <>
                  {deadlines.length === 0 && !showAddDl && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Žiadne termíny</div>}
                  {deadlines.map(dl => (
                    <div key={dl.id} style={{ marginBottom: '0.5rem' }}>
                      {editDlId === dl.id ? (
                        <form onSubmit={handleSaveDeadline} style={{ background: '#f5f3ff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #c4b5fd' }}>
                          <Grid2>
                            <FG label="Typ"><select value={editDlForm.typ} onChange={e => setEditDlForm(f => ({ ...f, typ: e.target.value }))}>{Object.entries(TYP_DEADLINE).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></FG>
                            <FG label="Dátum expirácie"><input type="date" value={editDlForm.datum_expiracie} onChange={e => setEditDlForm(f => ({ ...f, datum_expiracie: e.target.value }))} required /></FG>
                          </Grid2>
                          <FG label="Poznámka"><input value={editDlForm.poznamka} onChange={e => setEditDlForm(f => ({ ...f, poznamka: e.target.value }))} /></FG>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditDlId(null)}>Zrušiť</button>
                            <button type="submit" className="btn btn-primary" disabled={dlSaving}>{dlSaving ? 'Ukladám...' : 'Uložiť'}</button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dl.typ_label}</div>
                            <div style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                              <ExpiryBadge date={dl.datum_expiracie} dni={dl.dni} />
                              {dl.poznamka && <span style={{ color: 'var(--gray-400)', marginLeft: '0.5rem' }}>· {dl.poznamka}</span>}
                            </div>
                          </div>
                          <StavSelect stav={dl.stav || 'dobry'} stavManual={dl.stav_manual} canEdit={canEdit} onChangeStav={v => handleChangeStav(dl.id, v)} />
                          {canEdit && <button onClick={() => { setEditDlId(dl.id); setEditDlForm({ typ: dl.typ, datum_expiracie: dl.datum_expiracie, poznamka: dl.poznamka || '' }); setShowAddDl(false); }} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Upraviť</button>}
                          {isAdmin && <button onClick={() => handleDeleteDeadline(dl.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>}
                        </div>
                      )}
                    </div>
                  ))}
                  {showAddDl && (
                    <form onSubmit={handleAddDeadline} style={{ marginTop: '1rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <Grid2>
                        <FG label="Typ"><select value={dlForm.typ} onChange={e => setDlForm(f => ({ ...f, typ: e.target.value }))}>{Object.entries(TYP_DEADLINE).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></FG>
                        <FG label="Dátum expirácie"><input type="date" value={dlForm.datum_expiracie} onChange={e => setDlForm(f => ({ ...f, datum_expiracie: e.target.value }))} required /></FG>
                      </Grid2>
                      <FG label="Poznámka"><input value={dlForm.poznamka} onChange={e => setDlForm(f => ({ ...f, poznamka: e.target.value }))} /></FG>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddDl(false)}>Zrušiť</button>
                        <button type="submit" className="btn btn-primary" disabled={dlSaving}>{dlSaving ? 'Pridávam...' : 'Pridať'}</button>
                      </div>
                    </form>
                  )}
                  {canEdit && !showAddDl && <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setShowAddDl(true)}>+ Pridať termín</button>}
                </>
              )}
            </>
          )}

          {/* tab: servis */}
          {!isCreate && tab === 'service' && (
            <>
              {dlLoading ? <div style={{ color: 'var(--gray-400)' }}>Načítavam...</div> : (
                <>
                  {service.length === 0 && !showAddSv && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Žiadne servisné záznamy</div>}
                  {service.map(sv => (
                    <div key={sv.id} style={{ marginBottom: '0.5rem' }}>
                      {editSvId === sv.id ? (
                        <form onSubmit={handleSaveService} style={{ background: '#f5f3ff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #c4b5fd' }}>
                          <Grid2>
                            <FG label="Typ úkonu"><select value={editSvForm.typ_ukonu} onChange={e => setEditSvForm(f => ({ ...f, typ_ukonu: e.target.value }))}>{Object.entries(TYP_SERVIS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></FG>
                            <FG label="Dátum úkonu"><input type="date" value={editSvForm.datum_ukonu} onChange={e => setEditSvForm(f => ({ ...f, datum_ukonu: e.target.value }))} required /></FG>
                          </Grid2>
                          <FG label="Popis *"><input value={editSvForm.popis} onChange={e => setEditSvForm(f => ({ ...f, popis: e.target.value }))} required /></FG>
                          <Grid2>
                            <FG label="Cena (€)"><input type="number" step="0.01" value={editSvForm.cena} onChange={e => setEditSvForm(f => ({ ...f, cena: e.target.value }))} /></FG>
                            <FG label="Stav odometra (km)"><input type="number" value={editSvForm.stav_odometra_pri_servise} onChange={e => setEditSvForm(f => ({ ...f, stav_odometra_pri_servise: e.target.value }))} /></FG>
                          </Grid2>
                          <FG label="Poznámka"><input value={editSvForm.poznamka} onChange={e => setEditSvForm(f => ({ ...f, poznamka: e.target.value }))} /></FG>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditSvId(null)}>Zrušiť</button>
                            <button type="submit" className="btn btn-primary" disabled={svSaving}>{svSaving ? 'Ukladám...' : 'Uložiť'}</button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {TYP_SERVIS[sv.typ_ukonu] || sv.typ_ukonu}
                              <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--gray-500)' }}>· {sv.datum_ukonu}</span>
                            </div>
                            <div style={{ fontSize: '0.82rem', marginTop: '0.15rem', color: 'var(--gray-600)' }}>{sv.popis}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.15rem' }}>
                              {sv.cena != null && sv.cena !== '' && <span>{Number(sv.cena).toFixed(2)} €</span>}
                              {sv.stav_odometra_pri_servise && <span style={{ marginLeft: '0.5rem' }}>· {Number(sv.stav_odometra_pri_servise).toLocaleString('sk-SK')} km</span>}
                              {sv.poznamka && <span style={{ marginLeft: '0.5rem' }}>· {sv.poznamka}</span>}
                            </div>
                          </div>
                          {canEdit && <button onClick={() => handleEditService(sv)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Upraviť</button>}
                          {isAdmin && <button onClick={() => handleDeleteService(sv.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>}
                        </div>
                      )}
                    </div>
                  ))}
                  {showAddSv && (
                    <form onSubmit={handleAddService} style={{ marginTop: '1rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <Grid2>
                        <FG label="Typ úkonu"><select value={svForm.typ_ukonu} onChange={e => setSvForm(f => ({ ...f, typ_ukonu: e.target.value }))}>{Object.entries(TYP_SERVIS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></FG>
                        <FG label="Dátum úkonu *"><input type="date" value={svForm.datum_ukonu} onChange={e => setSvForm(f => ({ ...f, datum_ukonu: e.target.value }))} required /></FG>
                      </Grid2>
                      <FG label="Popis *"><input value={svForm.popis} onChange={e => setSvForm(f => ({ ...f, popis: e.target.value }))} required placeholder="napr. Výmena brzdových doštičiek" /></FG>
                      <Grid2>
                        <FG label="Cena (€)"><input type="number" step="0.01" value={svForm.cena} onChange={e => setSvForm(f => ({ ...f, cena: e.target.value }))} /></FG>
                        <FG label="Stav odometra (km)"><input type="number" value={svForm.stav_odometra_pri_servise} onChange={e => setSvForm(f => ({ ...f, stav_odometra_pri_servise: e.target.value }))} /></FG>
                      </Grid2>
                      <FG label="Poznámka"><input value={svForm.poznamka} onChange={e => setSvForm(f => ({ ...f, poznamka: e.target.value }))} /></FG>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddSv(false)}>Zrušiť</button>
                        <button type="submit" className="btn btn-primary" disabled={svSaving}>{svSaving ? 'Pridávam...' : 'Pridať'}</button>
                      </div>
                    </form>
                  )}
                  {canEdit && !showAddSv && <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setShowAddSv(true)}>+ Pridať servisný záznam</button>}
                </>
              )}
            </>
          )}

          {/* tab: dokumenty */}
          {!isCreate && tab === 'docs' && (
            <>
              {dlLoading ? <div style={{ color: 'var(--gray-400)' }}>Načítavam...</div> : (
                <>
                  {docs.length === 0 && !showUpload && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Žiadne dokumenty</div>}
                  {docs.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--gray-50)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.nazov}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: '0.1rem' }}>{TYP_DOC[doc.typ_dokumentu] || doc.typ_dokumentu} · {(doc.velkost / 1024).toFixed(0)} KB</div>
                      </div>
                      <button onClick={() => handleDownloadDoc(doc.id, doc.nazov)} style={{ fontSize: '0.8rem', color: '#7c3aed', background: 'none', padding: '0.3rem 0.6rem', border: '1px solid #7c3aed', borderRadius: '6px', cursor: 'pointer' }}>Stiahnuť</button>
                      {isAdmin && <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>}
                    </div>
                  ))}
                  {showUpload && (
                    <form onSubmit={handleUpload} style={{ marginTop: '1rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <FG label="Typ dokumentu"><select value={upForm.typ_dokumentu} onChange={e => setUpForm(f => ({ ...f, typ_dokumentu: e.target.value }))}>{Object.entries(TYP_DOC).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></FG>
                      <FG label="Názov (voliteľné)"><input value={upForm.nazov} onChange={e => setUpForm(f => ({ ...f, nazov: e.target.value }))} placeholder="Nechajte prázdne pre názov súboru" /></FG>
                      <FG label="Súbor (PDF, JPG, PNG — max. 10 MB)"><input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png,.webp" required /></FG>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>Zrušiť</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Nahrávam...' : 'Nahrať'}</button>
                      </div>
                    </form>
                  )}
                  {canEdit && !showUpload && <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setShowUpload(true)}>+ Pridať dokument</button>}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isCreate && mode === 'view' && tab === 'info' && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div>
              {isAdmin && <button className="btn" style={{ color: '#dc2626', border: '1px solid #fca5a5', background: 'none' }} onClick={handleDelete}>Zmazať</button>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>Zavrieť</button>
              {canEdit && <button className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={() => setMode('edit')}>Upraviť</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// hlavna stranka /vozidla

function Vehicles() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.rola === 'admin';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const location = useLocation();

  const [trailers, setTrailers]               = useState([]);
  const [trailersLoading, setTrailersLoading] = useState(true);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [showCreateTrailer, setShowCreateTrailer] = useState(false);

  useEffect(() => {
    api.get('/tracking/positions')
      .then(res => {
        setVehicles(res.data);
        const openEcv = location.state?.openEcv;
        if (openEcv) {
          const match = res.data.find(v => (v.identifikator || v.carid) === openEcv);
          if (match) setSelected(match);
          else setSelected({ identifikator: openEcv });
        }
      })
      .catch(() => setError('Nepodarilo sa načítať vozidlá'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/trailers')
      .then(res => setTrailers(res.data))
      .catch(() => {})
      .finally(() => setTrailersLoading(false));
  }, []);

  if (loading) return <div className="loading">Načítavam vozidlá...</div>;

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' };

  const sortedVehicles = [...vehicles].sort((a, b) => (b.is_own ? 1 : 0) - (a.is_own ? 1 : 0));

  return (
    <div>
      <div className="page-header">
        <h1>Vozidlá</h1>
        <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
          {vehicles.length} vozidiel
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={gridStyle}>
        {sortedVehicles.map(v => (
          <VehicleCard key={v.carid} vehicle={v} onClick={() => setSelected(v)} />
        ))}
      </div>

      {/* sekcia navesov */}
      <div style={{ marginTop: '2.5rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Návesy</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
              {trailersLoading ? '...' : `${trailers.length} návesov`}
            </span>
            {isAdmin && (
              <button className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={() => setShowCreateTrailer(true)}>
                + Pridať náves
              </button>
            )}
          </div>
        </div>

        {trailersLoading ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Načítavam návesy...</div>
        ) : trailers.length === 0 ? (
          <div style={{ color: 'var(--gray-400)', fontSize: '0.9rem', padding: '0.5rem 0' }}>Žiadne návesy</div>
        ) : (
          <div style={gridStyle}>
            {trailers.map(t => (
              <TrailerCard key={t.id} trailer={t} onClick={() => setSelectedTrailer(t)} />
            ))}
          </div>
        )}
      </div>

      {/* Modaly */}
      {selected && (
        <VehicleModal
          vehicle={selected}
          trailers={vehicles.filter(v => (v.identifikator || v.carid) !== (selected.identifikator || selected.carid))}
          onClose={() => setSelected(null)}
        />
      )}
      {selectedTrailer && (
        <TrailerModal
          trailer={selectedTrailer}
          onClose={() => setSelectedTrailer(null)}
          onSaved={updated => {
            setTrailers(ts => ts.map(t => t.ecv === updated.ecv ? updated : t));
            setSelectedTrailer(updated);
          }}
          onDeleted={ecv => {
            setTrailers(ts => ts.filter(t => t.ecv !== ecv));
            setSelectedTrailer(null);
          }}
        />
      )}
      {showCreateTrailer && (
        <TrailerModal
          trailer={null}
          onClose={() => setShowCreateTrailer(false)}
          onSaved={newTrailer => {
            setTrailers(ts => [...ts, newTrailer]);
            setShowCreateTrailer(false);
            setSelectedTrailer(newTrailer);
          }}
          onDeleted={() => {}}
        />
      )}
    </div>
  );
}

export default Vehicles;
