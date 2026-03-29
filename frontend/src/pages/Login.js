import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [heslo, setHeslo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, heslo);
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba pri prihlásení');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-palmer.png" alt="Palmer Spedition" />
        </div>
        <p className="subtitle">Prihláste sa do systému</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.sk"
              required
            />
          </div>

          <div className="form-group">
            <label>Heslo</label>
            <input
              type="password"
              value={heslo}
              onChange={(e) => setHeslo(e.target.value)}
              placeholder="Zadajte heslo"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;