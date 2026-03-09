import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';


/**
 * Login de tienda con permisos STORE_ADMIN / STORE_READONLY.
 */
export function StoreLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    setError('');
    setIsSubmitting(true);
    try {
      await login({ username, password, portal: 'tienda' });
      navigate('/tienda');
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : 'No se pudo iniciar sesion';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: 'var(--koaj-bg-app)' }}>
      <div className="koaj-container" style={{ minHeight: 'auto', width: '100%', maxWidth: '400px', padding: '40px', marginTop: 0 }}>
        <h2 className="text-center mb-1 koaj-topbar-logo" style={{ fontSize: '2rem' }}>KOAJ</h2>
        <p className="text-center text-muted mb-4 small">Tienda / Vendedor</p>

        <div className="mb-3">
          <label className="koaj-label">Usuario</label>
          <input
            type="text"
            placeholder="Introduce tu usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="koaj-input"
            autoComplete="username"
          />
        </div>

        <div className="mb-4">
          <label className="koaj-label">Contraseña</label>
          <input
            type="password"
            placeholder="Introduce tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="koaj-input"
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-danger small mb-3 text-center">{error}</p>}

        <button className="btn-koaj-primary w-100 py-2 mt-2" onClick={handleLogin} disabled={isSubmitting}>
          {isSubmitting ? 'Validando...' : 'Entrar a la Tienda'}
        </button>
      </div>
    </div>
  );
}
