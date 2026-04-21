import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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

const PAGE_TITLES = {
  '/':             'Dashboard',
  '/vozidla':      'Vozidlá',
  '/vodici':       'Vodiči',
  '/upomienky':    'Upomienky',
  '/pouzivatelia': 'Používatelia',
  '/system-log':   'Systémový log',
  '/wd-debug':     'WD Debug',
};

function Layout() {
  const { user, logout, updateUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const initials   = `${(user?.meno?.[0] || '').toUpperCase()}${(user?.priezvisko?.[0] || '').toUpperCase()}` || '?';
  const isVodic    = user?.rola === 'vodic';
  const pageTitle  = PAGE_TITLES[location.pathname] || 'Palmer Fleet';

  const navLinks = (
    <>
      <NavLink to="/" end>Dashboard</NavLink>
      <NavLink to="/vozidla">Vozidlá</NavLink>
      <NavLink to="/vodici">Vodiči</NavLink>
      {!isVodic && <NavLink to="/upomienky">Upomienky</NavLink>}
      {(user?.rola === 'admin' || user?.rola === 'dispecer' || user?.rola === 'manazer') && (
        <NavLink to="/pouzivatelia">Používatelia</NavLink>
      )}
      {user?.rola === 'admin' && <NavLink to="/system-log">Systémový log</NavLink>}
      {user?.rola === 'admin' && <NavLink to="/wd-debug">WD Debug</NavLink>}
    </>
  );

  return (
    <div className="layout">
      <header className="top-nav">
        <div className="top-nav-logo">Palmer</div>
        <div className="top-nav-title">{pageTitle}</div>
        <button
          className={`top-nav-menu-btn ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Zavrieť menu' : 'Otvoriť menu'}
          aria-expanded={menuOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </header>

      {menuOpen && (
        <>
          <div className="top-nav-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="top-nav-drawer" role="menu">
            <div className="top-nav-drawer-user">
              <div className="top-nav-drawer-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="top-nav-drawer-name">{user?.meno} {user?.priezvisko}</div>
                <div className="top-nav-drawer-role">{ROLE_LABELS[user?.rola] || user?.rola}</div>
              </div>
            </div>

            <nav className="top-nav-drawer-links">{navLinks}</nav>

            <div className="top-nav-drawer-actions">
              <button onClick={() => { setShowProfile(true); setMenuOpen(false); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Môj profil
              </button>
              <button onClick={logout} className="top-nav-drawer-logout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Odhlásiť sa
              </button>
            </div>
          </div>
        </>
      )}

      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Palmer Fleet</h2>
          <span>Správa vozového parku</span>
        </div>

        <nav className="sidebar-nav">{navLinks}</nav>

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