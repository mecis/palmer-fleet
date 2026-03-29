import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ROLE_LABELS = {
  admin: 'Admin',
  dispecer: 'Dispečer',
  manazer: 'Manažér',
  vodic: 'Vodič',
};

function ProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    meno: user?.meno || '',
    priezvisko: user?.priezvisko || '',
    email: user?.email || '',
    telefon: user?.telefon || '',
    heslo: '',
    heslo_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.heslo && form.heslo !== form.heslo_confirm) {
      setError('Heslá sa nezhodujú');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        meno: form.meno,
        priezvisko: form.priezvisko,
        email: form.email,
        telefon: form.telefon,
      };
      if (form.heslo) payload.heslo = form.heslo;

      await api.put(`/users/${user.id}`, payload);
      onSaved({ meno: form.meno, priezvisko: form.priezvisko, email: form.email, telefon: form.telefon });
      setSuccess('Profil bol uložený');
      setForm((f) => ({ ...f, heslo: '', heslo_confirm: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri ukladaní');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Môj profil</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
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
            <input name="telefon" value={form.telefon} onChange={handleChange} placeholder="+421 900 000 000" />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '1rem 0' }} />

          <div className="form-group">
            <label>Nové heslo <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}>(nechajte prázdne pre zachovanie)</span></label>
            <input name="heslo" type="password" value={form.heslo} onChange={handleChange} placeholder="Min. 6 znakov" />
          </div>

          <div className="form-group">
            <label>Potvrdiť heslo</label>
            <input name="heslo_confirm" type="password" value={form.heslo_confirm} onChange={handleChange} placeholder="Zopakujte nové heslo" />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Zavrieť</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Ukladám...' : 'Uložiť zmeny'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Layout() {
  const { user, logout, updateUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Palmer Fleet</h2>
          <span>Správa vozového parku</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/vozidla">
            Vozidlá
          </NavLink>
          <NavLink to="/sledovanie">
            Sledovanie
          </NavLink>
          <NavLink to="/vodici">
            Vodiči
          </NavLink>
          {(user?.rola === 'admin' || user?.rola === 'dispecer' || user?.rola === 'manazer') && (
            <NavLink to="/pouzivatelia">
              Používatelia
            </NavLink>
          )}
          {user?.rola === 'admin' && (
            <NavLink to="/system-log">
              Systémový log
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-profile-btn" onClick={() => setShowProfile(true)}>
            <div className="user-name">{user?.meno} {user?.priezvisko}</div>
            <div className="user-role">{ROLE_LABELS[user?.rola] || user?.rola}</div>
          </button>
          <button onClick={logout}>Odhlásiť sa</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onSaved={updateUser} />
      )}
    </div>
  );
}

export default Layout;