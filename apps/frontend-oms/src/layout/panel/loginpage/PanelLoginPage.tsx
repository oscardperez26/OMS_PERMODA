import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./panel-login-page.css";

export function PanelLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    const MOCK_USER = "admin";
    const MOCK_PASS = "admin123";

    if (username === MOCK_USER && password === MOCK_PASS) {
      localStorage.setItem("role", "ADMIN");
      navigate("/panel");
    } else {
      setError("Credenciales inválidas");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Login Gestor</h2>
        <p className="login-subtitle">
          Acceso exclusivo para administradores
        </p>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-input"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />

        {error && <p className="login-error">{error}</p>}

        <button className="login-button" onClick={handleLogin}>
          Entrar al Panel
        </button>
      </div>
    </div>
  );
}