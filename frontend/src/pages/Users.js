import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  admin: 'Admin',
  dispecer: 'Dispečer',
  manazer: 'Manažér',
  vodic: 'Vodič',
};

const ROLE_BADGE = {
  admin: 'badge-danger',
  dispecer: 'badge-warning',
  manazer: 'badge-info',
  vodic: 'badge-success',
};

const EMPTY_FORM = {
  meno: '',
  priezvisko: '',
  email: '',
  telefon: '',
  rola: 'vodic',
  wd_driver_id: '',
  aktivny: 1,
  heslo: '',
};

function UserModal({ user, onClose, onSaved, isNew, isSelf }) {
  const [form, setForm] = useState(
    isNew ? EMPTY_FORM : { ...EMPTY_FORM, ...user, wd_driver_id: user?.wd_driver_id || '', heslo: '' }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wdDrivers, setWdDrivers] = useState([]);

  useEffect(() => {
    if (form.rola === 'vodic') {
      api.get('/tracking/drivers')
        .then(res => setWdDrivers(res.data || []))
        .catch(() => {});
    }
  }, [form.rola]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.heslo) delete payload.heslo;
      payload.wd_driver_id = payload.rola === 'vodic' && payload.wd_driver_id ? Number(payload.wd_driver_id) : null;
      if (isNew) {
        await api.post('/users', payload);
      } else {
        await api.put(`/users/${user.id}`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri ukladaní');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{isNew ? 'Nový používateľ' : 'Upraviť používateľa'}</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label>Meno</label>
              <input name="meno" value={form.meno} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Priezvisko</label>
              <input name="priezvisko" value={form.priezvisko} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Telefón</label>
            <input name="telefon" value={form.telefon || ''} onChange={handleChange} placeholder="+421 900 000 000" />
          </div>

          <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label>Rola</label>
              <select name="rola" value={form.rola} onChange={handleChange} disabled={isSelf}>
                <option value="vodic">Vodič</option>
                <option value="dispecer">Dispečer</option>
                <option value="manazer">Manažér</option>
                <option value="admin">Admin</option>
              </select>
              {isSelf && (
                <small style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                  Svoju vlastnú rolu nemôžeš zmeniť
                </small>
              )}
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="aktivny" value={form.aktivny} onChange={handleChange} disabled={isSelf}>
                <option value={1}>Aktívny</option>
                <option value={0}>Neaktívny</option>
              </select>
              {isSelf && (
                <small style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                  Nemôžeš deaktivovať sám seba
                </small>
              )}
            </div>
          </div>

          {form.rola === 'vodic' && (
            <div className="form-group">
              <label>Priradený WD vodič</label>
              <select name="wd_driver_id" value={form.wd_driver_id || ''} onChange={handleChange}>
                <option value="">— nevybraný —</option>
                {wdDrivers.map(d => (
                  <option key={d.iddriver} value={d.iddriver}>
                    {d.jmeno} {d.prijmeni} (#{d.iddriver})
                  </option>
                ))}
              </select>
              <small style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                Prepojí účet s konkrétnym vodičom vo Webdispečink
              </small>
            </div>
          )}

          <div className="form-group">
            <label>{isNew ? 'Heslo' : 'Nové heslo (nechajte prázdne pre zachovanie)'}</label>
            <input
              name="heslo"
              type="password"
              value={form.heslo}
              onChange={handleChange}
              placeholder={isNew ? 'Min. 6 znakov' : '••••••'}
              required={isNew}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Zrušiť</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Ukladám...' : 'Uložiť'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState('');

  const isAdmin = currentUser?.rola === 'admin';

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError('Nepodarilo sa načítať používateľov');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSaved = (msg) => {
    setSelectedUser(null);
    setShowNew(false);
    setSuccess(msg || 'Zmeny boli uložené');
    loadUsers();
    setTimeout(() => setSuccess(''), 3000);
  };

  if (loading) return <div className="loading">Načítavam...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Používatelia</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + Nový používateľ
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Meno</th>
                <th>Email</th>
                <th>Telefón</th>
                <th>Rola</th>
                <th>Status</th>
                <th>Registrovaný</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => isAdmin && setSelectedUser(u)}
                  style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                >
                  <td style={{ fontWeight: 500 }}>{u.meno} {u.priezvisko}</td>
                  <td>{u.email}</td>
                  <td>{u.telefon || '—'}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.rola] || 'badge-info'}`}>
                      {ROLE_LABELS[u.rola] || u.rola}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.aktivny ? 'badge-success' : 'badge-danger'}`}>
                      {u.aktivny ? 'Aktívny' : 'Neaktívny'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--gray-500)' }}>
                    {new Date(u.datum_vytvorenia).toLocaleDateString('sk-SK')}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                    Žiadni používatelia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={() => handleSaved('Používateľ bol aktualizovaný')}
          isNew={false}
          isSelf={selectedUser.id === currentUser?.id}
        />
      )}

      {showNew && (
        <UserModal
          onClose={() => setShowNew(false)}
          onSaved={() => handleSaved('Používateľ bol vytvorený')}
          isNew={true}
        />
      )}
    </div>
  );
}

export default Users;
