import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DriverIcon = () => (
  <img src="/driver-avatar.png" alt="vodič" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
);

// "HH:MM:SS" (môže byť >24h) → "123 h 45 min"
function formatDriveTime(str) {
  if (!str || typeof str !== 'string') return '—';
  const parts = str.split(':');
  if (parts.length < 2) return str;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  if (h === 0 && m === 0) return '0 h';
  return `${h} h${m ? ` ${m} min` : ''}`;
}

// karta vodica v gridu

function DriverCard({ driver, onClick }) {
  const isDriving  = driver.is_driving;
  const hasVehicle = !!driver.current_spz;

  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 0, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        border: `2px solid ${isDriving ? '#16a34a' : '#e5e7eb'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Avatar */}
      <div style={{
        background: isDriving ? 'linear-gradient(135deg,#dcfce7,#f0fdf4)' : 'linear-gradient(135deg,#f3f4f6,#f9fafb)',
        height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <DriverIcon />
        <div style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: isDriving ? '#16a34a' : '#e5e7eb',
          color: isDriving ? 'white' : '#6b7280',
          borderRadius: '20px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 600,
        }}>
          {isDriving && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          {isDriving ? 'Jazdí' : 'Nejazdí'}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.75rem' }}>
          {driver.jmeno} {driver.prijmeni}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vozidlo</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: hasVehicle ? 'var(--gray-800)' : 'var(--gray-400)' }}>
              {driver.current_spz || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stredisko</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{driver.stredisko || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doba jazdy</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)' }}>{formatDriveTime(driver.total_drive_time)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// modal: detail + editacia

const TYP_ZMLUVY = { hlavny_pomer: 'Hlavný pracovný pomer', dohoda: 'Dohoda', brigada: 'Brigáda', ine: 'Iné' };
const TYP_DOC    = { obciansky_preukaz: 'Občiansky preukaz', poistka_vodica: 'Poistka vodiča', pracovna_zmluva: 'Pracovná zmluva', certifikat_a1: 'Certifikát A1', psychotest: 'Psychotest', ine: 'Iné' };

function ExpiryBadge({ date }) {
  if (!date) return <span style={{ color: 'var(--gray-400)' }}>—</span>;
  const days = Math.ceil((new Date(date) - new Date()) / 86400000);
  const color = days < 0 ? '#dc2626' : days < 30 ? '#d97706' : days < 90 ? '#ca8a04' : '#16a34a';
  const label = days < 0 ? 'Expirované' : days < 30 ? `${days} dní` : new Date(date).toLocaleDateString('sk-SK');
  return (
    <span style={{ color, fontWeight: 600, fontSize: '0.85rem' }}>
      {new Date(date).toLocaleDateString('sk-SK')}
      {days < 90 && <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', background: color + '20', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{label}</span>}
    </span>
  );
}

function DriverModal({ driver, onClose, userId }) {
  const { user: currentUser } = useAuth();
  const isAdmin    = currentUser?.rola === 'admin';
  const canEdit    = ['admin', 'dispecer', 'manazer'].includes(currentUser?.rola);
  const canSeeSalary = ['admin', 'manazer'].includes(currentUser?.rola);

  const [tab, setTab]         = useState('info');      // info | work | docs
  const [mode, setMode]       = useState('view');      // view | edit
  const [dbData, setDbData]   = useState(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Edit form
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Upload
  const [uploading, setUploading] = useState(false);
  const [upForm, setUpForm]       = useState({ nazov: '', typ_dokumentu: 'ine', datum_expiracie: '' });
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef(null);

  const loadDbData = () => {
    if (!userId) return;
    setDbLoading(true);
    api.get(`/drivers/${userId}`)
      .then(r => { setDbData(r.data); setForm(r.data.details || {}); })
      .catch(err => setError(err.response?.data?.error || err.message || 'Chyba načítania'))
      .finally(() => setDbLoading(false));
  };

  useEffect(() => { if (canEdit) loadDbData(); }, [userId]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await api.put(`/drivers/${userId}`, form);
      setSuccess('Zmeny uložené');
      setMode('view');
      loadDbData();
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri ukladaní');
    } finally { setSaving(false); }
  };

  const handleUpload = async e => {
    e.preventDefault();
    if (!fileRef.current?.files[0]) return;
    const data = new FormData();
    data.append('file', fileRef.current.files[0]);
    data.append('nazov', upForm.nazov || fileRef.current.files[0].name);
    data.append('typ_dokumentu', upForm.typ_dokumentu);
    if (upForm.datum_expiracie) data.append('datum_expiracie', upForm.datum_expiracie);
    setUploading(true);
    try {
      await api.post(`/drivers/${userId}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false);
      setUpForm({ nazov: '', typ_dokumentu: 'ine', datum_expiracie: '' });
      loadDbData();
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri nahrávaní');
    } finally { setUploading(false); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Zmazať dokument?')) return;
    try {
      await api.delete(`/drivers/${userId}/documents/${docId}`);
      loadDbData();
    } catch {}
  };

  const handleDownloadDoc = async (docId, nazov) => {
    try {
      const res = await api.get(`/drivers/${userId}/documents/${docId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = nazov;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Nepodarilo sa stiahnuť dokument');
    }
  };

  const tabStyle = active => ({
    padding: '0.5rem 1rem', border: 'none', borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    background: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400,
    color: active ? 'var(--primary)' : 'var(--gray-500)', fontSize: '0.9rem',
  });

  const details = dbData?.details || {};
  const docs    = dbData?.documents || [];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '680px', width: '100%', padding: 0, overflow: 'hidden' }}>

        {/* Hlavička */}
        <div style={{ background: driver.is_driving ? 'linear-gradient(135deg,#dcfce7,#f0fdf4)' : 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
            {/* Avatar v kruhu */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: driver.is_driving ? '#bbf7d0' : '#e5e7eb',
              border: `3px solid ${driver.is_driving ? '#16a34a' : '#d1d5db'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '100%', height: '100%' }}><DriverIcon /></div>
            </div>

            {/* Meno + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {driver.jmeno} {driver.prijmeni}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: driver.is_driving ? '#16a34a' : '#e5e7eb',
                  color: driver.is_driving ? 'white' : '#6b7280',
                  borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 600,
                }}>
                  {driver.is_driving && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
                  {driver.is_driving ? 'Jazdí' : 'Nejazdí'}
                </span>
                {driver.current_spz && (
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)', background: 'white', padding: '0.15rem 0.55rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                    {driver.current_spz}
                  </span>
                )}
              </div>
            </div>

            {/* Zavrieť */}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, flexShrink: 0, padding: '0.25rem' }}>×</button>
          </div>

          {/* Taby */}
          <div style={{ display: 'flex', gap: '0.25rem', paddingLeft: '1.5rem' }}>
            {[['info','Informácie'],['work','Pracovné'],['docs','Dokumenty']].map(([k,l]) => (
              <button key={k} style={tabStyle(tab === k)} onClick={() => { setTab(k); setMode('view'); setError(''); setSuccess(''); }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Obsah */}
        <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

          {/* tab: info */}
          {tab === 'info' && mode === 'view' && (
            <>
              <Section title="Z Webdispečink">
                <Grid2>
                  <InfoRow label="Stredisko"    value={driver.stredisko   || '—'} />
                  <InfoRow label="Osobné číslo" value={driver.osobnicislo || '—'} />
                  <InfoRow label="Divízia"      value={driver.divize      || '—'} />
                  <InfoRow label="Skupina"      value={driver.groupname   || '—'} />
                  <InfoRow label="Telefón (WD)" value={driver.mobil       || '—'} />
                  <InfoRow label="Celková doba jazdy" value={formatDriveTime(driver.total_drive_time)} />
                  <InfoRow label="Celkom km"    value={driver.total_km != null ? `${Number(driver.total_km).toLocaleString('sk-SK', { maximumFractionDigits: 0 })} km` : '—'} />
                </Grid2>
                {driver.adresa && <InfoRow label="Adresa" value={<span style={{ whiteSpace: 'pre-line' }}>{driver.adresa}</span>} />}
              </Section>

              {canEdit && (
                <Section title="Systémové údaje">
                  {dbLoading ? <div style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Načítavam...</div> : (
                    <Grid2>
                      <InfoRow label="Bydlisko"        value={details.bydlisko       || '—'} />
                      <InfoRow label="Tel. firemný"    value={details.telefon_firemny  || '—'} />
                      <InfoRow label="Tel. súkromný"   value={details.telefon_sukromny || '—'} />
                      {isAdmin && <InfoRow label="Rodné číslo"    value={details.rodne_cislo  || '—'} />}
                    </Grid2>
                  )}
                  {details.poznamka && <InfoRow label="Poznámka" value={details.poznamka} />}
                </Section>
              )}
            </>
          )}

          {tab === 'info' && mode === 'edit' && (
            <form onSubmit={handleSave}>
              <Section title="Osobné údaje">
                <Grid2>
                  <FG label="Bydlisko"><input name="bydlisko" value={form.bydlisko || ''} onChange={handleChange} /></FG>
                  {isAdmin && <FG label="Rodné číslo (šifrované)"><input name="rodne_cislo" value={form.rodne_cislo || ''} onChange={handleChange} placeholder="XXXXXX/XXXX" /></FG>}
                  <FG label="Tel. firemný"><input name="telefon_firemny" value={form.telefon_firemny || ''} onChange={handleChange} placeholder="+421..." /></FG>
                  <FG label="Tel. súkromný"><input name="telefon_sukromny" value={form.telefon_sukromny || ''} onChange={handleChange} placeholder="+421..." /></FG>
                </Grid2>
                <FG label="Poznámka"><textarea name="poznamka" value={form.poznamka || ''} onChange={handleChange} rows={2} style={{ resize: 'vertical' }} /></FG>
              </Section>
              <Actions onCancel={() => setMode('view')} saving={saving} />
            </form>
          )}

          {/* tab: pracovne udaje */}
          {tab === 'work' && mode === 'view' && (
            <Section title="Pracovné informácie">
              {dbLoading ? <div style={{ color: 'var(--gray-400)' }}>Načítavam...</div> : (
                <Grid2>
                  <InfoRow label="Typ zmluvy"   value={TYP_ZMLUVY[details.typ_zmluvy] || '—'} />
                  <InfoRow label="Nástup"       value={details.datum_nastup ? new Date(details.datum_nastup).toLocaleDateString('sk-SK') : '—'} />
                  {canSeeSalary && <InfoRow label="Mzda (€)" value={details.mzda ? Number(details.mzda).toLocaleString('sk-SK') + ' €' : '—'} />}
                  <InfoRow label="Psychotesty"   value={<ExpiryBadge date={details.psychotesty_platnost} />} />
                  <InfoRow label="Certifikát A1" value={<ExpiryBadge date={details.certifikat_a1_platnost} />} />
                  <InfoRow label="Poistenie"     value={<ExpiryBadge date={details.poistenie_vodica_platnost} />} />
                </Grid2>
              )}
            </Section>
          )}

          {tab === 'work' && mode === 'edit' && (
            <form onSubmit={handleSave}>
              <Section title="Pracovné informácie">
                <Grid2>
                  <FG label="Typ zmluvy">
                    <select name="typ_zmluvy" value={form.typ_zmluvy || ''} onChange={handleChange}>
                      <option value="">— vybrať —</option>
                      {Object.entries(TYP_ZMLUVY).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </FG>
                  <FG label="Dátum nástupu"><input type="date" name="datum_nastup" value={form.datum_nastup || ''} onChange={handleChange} /></FG>
                  {canSeeSalary && <FG label="Mzda (€)"><input type="number" name="mzda" value={form.mzda || ''} onChange={handleChange} min={0} step={0.01} /></FG>}
                </Grid2>
              </Section>
              <Section title="Platnosti dokumentov">
                <Grid2>
                  <FG label="Psychotesty — platnosť"><input type="date" name="psychotesty_platnost" value={form.psychotesty_platnost || ''} onChange={handleChange} /></FG>
                  <FG label="Certifikát A1 — platnosť"><input type="date" name="certifikat_a1_platnost" value={form.certifikat_a1_platnost || ''} onChange={handleChange} /></FG>
                  <FG label="Poistenie vodiča — platnosť"><input type="date" name="poistenie_vodica_platnost" value={form.poistenie_vodica_platnost || ''} onChange={handleChange} /></FG>
                </Grid2>
              </Section>
              <Actions onCancel={() => setMode('view')} saving={saving} />
            </form>
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
                      {TYP_DOC[doc.typ_dokumentu]} · {(doc.velkost / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadDoc(doc.id, doc.nazov)}
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
        </div>

        {/* Footer */}
        {mode === 'view' && tab !== 'docs' && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Zavrieť</button>
            {canEdit && <button className="btn btn-primary" onClick={() => setMode('edit')}>Upraviť</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// male reusable kusy

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
function FG({ label, children }) {
  return <div className="form-group" style={{ marginBottom: '0.5rem' }}><label style={{ fontSize: '0.8rem' }}>{label}</label>{children}</div>;
}
function Actions({ onCancel, saving }) {
  return (
    <div className="modal-actions" style={{ paddingTop: '0.5rem' }}>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Späť</button>
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Ukladám...' : 'Uložiť zmeny'}</button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{value}</div>
    </div>
  );
}

// hlavna stranka /vodici

function Drivers() {
  const { user } = useAuth();
  const isVodic = user?.rola === 'vodic';
  const [drivers, setDrivers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [selected, setSelected]       = useState(null);
  const [showNoVehicle, setShowNoVehicle] = useState(isVodic);
  const location = useLocation();

  useEffect(() => {
    api.get('/tracking/drivers')
      .then(res => {
        setDrivers(res.data);
        const openId = location.state?.openDriverId;
        if (openId) {
          const match = res.data.find(d => String(d.iddriver) === String(openId));
          if (match) setSelected(match);
        }
      })
      .catch(() => setError('Nepodarilo sa načítať vodičov'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Načítavam vodičov...</div>;

  const active         = drivers.filter(d => d.disabled !== '1');
  const withVehicle    = active.filter(d => d.current_spz);
  const withoutVehicle = active.filter(d => !d.current_spz);

  const sorted = [...withVehicle].sort((a, b) => {
    if (a.is_driving && !b.is_driving) return -1;
    if (!a.is_driving && b.is_driving) return 1;
    return 0;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Vodiči</h1>
        <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
          {withVehicle.filter(d => d.is_driving).length} jazdí · {withVehicle.length} s vozidlom
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.25rem' }}>
        {sorted.map(d => (
          <DriverCard key={d.iddriver} driver={d} onClick={() => setSelected(d)} />
        ))}
      </div>

      {withoutVehicle.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={() => setShowNoVehicle(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)', fontSize: '0.9rem', padding: 0, marginBottom: '1rem' }}
          >
            <span style={{ fontSize: '0.75rem', display: 'inline-block', transition: 'transform 0.2s', transform: showNoVehicle ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            Bez priradeného vozidla ({withoutVehicle.length})
          </button>
          {showNoVehicle && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.25rem' }}>
              {withoutVehicle.map(d => (
                <DriverCard key={d.iddriver} driver={d} onClick={() => setSelected(d)} />
              ))}
            </div>
          )}
        </div>
      )}

      {selected && <DriverModal driver={selected} userId={selected.iddriver} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default Drivers;
