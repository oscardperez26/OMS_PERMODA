import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import './panel-login-page.css';

/**
 * Login para panel administrador.
 * Usa el mismo backend de auth que tienda, pero con portal=panel.
 */
export function PanelLoginPage() {
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
      await login({ username, password, portal: 'panel' });
      navigate('/panel');
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : 'No se pudo iniciar sesion';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Login Gestor</h2>
        <p className="login-subtitle">Acceso exclusivo para administradores</p>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="login-input"
          autoComplete="username"
        />

        <input
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="login-input"
          autoComplete="current-password"
        />

        {error && <p className="login-error">{error}</p>}

        <button className="login-button" onClick={handleLogin} disabled={isSubmitting}>
          {isSubmitting ? 'Validando...' : 'Entrar al Panel'}
        </button>
      </div>
    </div>
  );
}
