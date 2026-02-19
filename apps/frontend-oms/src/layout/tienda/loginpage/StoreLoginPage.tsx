import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import './store-login-page.css';

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
    <div className="store-login-page">
      <div className="store-login-card">
        <h2>Login Tienda</h2>
        <p className="store-login-subtitle">Accede como tienda / vendedor</p>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="store-login-input"
          autoComplete="username"
        />

        <input
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="store-login-input"
          autoComplete="current-password"
        />

        {error && <p className="store-login-error">{error}</p>}

        <button className="store-login-button" onClick={handleLogin} disabled={isSubmitting}>
          {isSubmitting ? 'Validando...' : 'Entrar a la Tienda'}
        </button>
      </div>
    </div>
  );
}
