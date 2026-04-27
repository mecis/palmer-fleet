import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('sk-SK');
}

function fmtSize(bytes) {
  if (!bytes) return '';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function UploadCmrModal({ onClose, onUploaded, defaultEcv, vehicles, drivers, isAdmin, currentDriverId }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    ecv: defaultEcv || '',
    cislo_cmr: '',
    datum_prepravy: new Date().toISOString().slice(0, 10),
    poznamka: '',
    wd_driver_id: currentDriverId || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!fileRef.current?.files[0]) { setError('Vyber súbor'); return; }
    if (!form.ecv) { setError('EČV je povinné'); return; }

    const data = new FormData();
    data.append('file', fileRef.current.files[0]);
    data.append('ecv', form.ecv);
    data.append('cislo_cmr', form.cislo_cmr);
    data.append('datum_prepravy', form.datum_prepravy);
    data.append('poznamka', form.poznamka);
    if (isAdmin && form.wd_driver_id) data.append('wd_driver_id', form.wd_driver_id);

    setBusy(true);
    try {
      await api.post('/cmr', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Nepodarilo sa nahrať');
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2>Nahrať CMR</h2>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Vozidlo (EČV) *</label>
            {vehicles?.length > 0 ? (
              <select value={form.ecv} onChange={e => setForm(f => ({ ...f, ecv: e.target.value }))} required>
                <option value="">— vyber —</option>
                {vehicles.map(v => {
                  const id = v.identifikator || v.carid || v.ecv;
                  return <option key={id} value={id}>{id}{v.driver ? ` · ${v.driver}` : ''}</option>;
                })}
              </select>
            ) : (
              <input value={form.ecv} onChange={e => setForm(f => ({ ...f, ecv: e.target.value }))} required />
            )}
          </div>

          {isAdmin && drivers?.length > 0 && (
            <div className="form-group">
              <label>Vodič</label>
              <select value={form.wd_driver_id} onChange={e => setForm(f => ({ ...f, wd_driver_id: e.target.value }))}>
                <option value="">— neuvedený —</option>
                {drivers.map(d => (
                  <option key={d.iddriver} value={d.iddriver}>{d.jmeno} {d.prijmeni}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label>Číslo CMR</label>
              <input value={form.cislo_cmr} onChange={e => setForm(f => ({ ...f, cislo_cmr: e.target.value }))} placeholder="napr. SK-2026-0042" />
            </div>
            <div className="form-group">
              <label>Dátum prepravy</label>
              <input type="date" value={form.datum_prepravy} onChange={e => setForm(f => ({ ...f, datum_prepravy: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label>Poznámka</label>
            <input value={form.poznamka} onChange={e => setForm(f => ({ ...f, poznamka: e.target.value }))} placeholder="napr. nakládka Bratislava → vykládka Wien" />
          </div>

          <div className="form-group">
            <label>Súbor (PDF / JPG / PNG, max 10 MB) *</label>
            <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png,.webp" required />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Nahrávam…' : 'Nahrať CMR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Cmr() {
  const { user } = useAuth();
  const location = useLocation();
  const isVodic = user?.rola === 'vodic';
  const isAdmin = user?.rola === 'admin';
  const canUpload = isVodic || isAdmin;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // filter
  const [filterEcv, setFilterEcv] = useState('');
  const [filterDriver, setFilterDriver] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/cmr').then(r => setList(r.data)).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/tracking/positions').then(r => setVehicles(r.data)).catch(() => {});
    api.get('/tracking/drivers').then(r => setDrivers(r.data)).catch(() => {});
  }, []);

  // ked sem prides z DriverHome ("Nahrať CMR"), modal sa otvori automaticky
  useEffect(() => {
    if (location.state?.openUpload && canUpload) setShowUpload(true);
  }, [location.state, canUpload]);

  const myVehicleEcv = (() => {
    if (!isVodic) return '';
    const myCar = vehicles.find(v => v.is_own);
    return myCar?.identifikator || vehicles[0]?.identifikator || '';
  })();

  const driverNameMap = drivers.reduce((acc, d) => {
    acc[d.iddriver] = `${d.jmeno} ${d.prijmeni}`;
    return acc;
  }, {});

  const filtered = list.filter(c => {
    if (filterEcv && !c.ecv?.toLowerCase().includes(filterEcv.toLowerCase())) return false;
    if (filterDriver) {
      const name = driverNameMap[c.wd_driver_id] || '';
      if (!name.toLowerCase().includes(filterDriver.toLowerCase())) return false;
    }
    return true;
  });

  const download = async (id, nazov) => {
    try {
      const res = await api.get(`/cmr/${id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = nazov; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const remove = async (id) => {
    if (!window.confirm('Zmazať tento CMR záznam?')) return;
    try {
      await api.delete(`/cmr/${id}`);
      setList(l => l.filter(x => x.id !== id));
    } catch {}
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>CMR — Nákladné listy</h1>
          <p style={{ color: 'var(--gray-500)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            {isVodic ? 'Vidíš len svoje CMR záznamy' : 'Všetky CMR záznamy'}
          </p>
        </div>
        {canUpload && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            + Nahrať CMR
          </button>
        )}
      </div>

      {!isVodic && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Filter podľa EČV"
            value={filterEcv}
            onChange={e => setFilterEcv(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--gray-300)', borderRadius: 6, fontSize: '0.9rem', minWidth: 180 }}
          />
          <input
            placeholder="Filter podľa vodiča"
            value={filterDriver}
            onChange={e => setFilterDriver(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--gray-300)', borderRadius: 6, fontSize: '0.9rem', minWidth: 180 }}
          />
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Načítavam…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Žiadne CMR záznamy</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 1rem' }}>Dátum</th>
                  <th style={{ padding: '0.6rem 1rem' }}>EČV</th>
                  <th style={{ padding: '0.6rem 1rem' }}>Číslo CMR</th>
                  <th style={{ padding: '0.6rem 1rem' }}>Vodič</th>
                  <th style={{ padding: '0.6rem 1rem' }}>Súbor</th>
                  <th style={{ padding: '0.6rem 1rem' }}>Poznámka</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: '0.6rem 1rem' }}>{formatDate(c.datum_prepravy)}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.ecv}</span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>{c.cislo_cmr || '—'}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      {driverNameMap[c.wd_driver_id] || (c.nahral_meno ? `${c.nahral_meno} ${c.nahral_priezvisko}` : '—')}
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ color: 'var(--gray-600)' }}>{c.nazov}</span>
                      <span style={{ color: 'var(--gray-400)', marginLeft: 6, fontSize: '0.8rem' }}>{fmtSize(c.velkost)}</span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--gray-500)' }}>{c.poznamka || '—'}</td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => download(c.id, c.nazov)}
                        style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', padding: '0.25rem 0.6rem', border: '1px solid var(--primary)', borderRadius: 6, cursor: 'pointer' }}
                      >Stiahnuť</button>
                      {isAdmin && (
                        <button
                          onClick={() => remove(c.id)}
                          style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem' }}
                          title="Zmazať"
                        >×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadCmrModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
          defaultEcv={isVodic ? myVehicleEcv : ''}
          vehicles={vehicles}
          drivers={drivers}
          isAdmin={isAdmin}
          currentDriverId={user?.wd_driver_id || ''}
        />
      )}
    </div>
  );
}

export default Cmr;
