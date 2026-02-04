import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./store-login-page.css";

export function StoreLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    const MOCK_USER = "tienda";
    const MOCK_PASS = "1234";

    if (username === MOCK_USER && password === MOCK_PASS) {
      localStorage.setItem("role", "STORE");
      navigate("/tienda");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  }

  return (
    <div className="store-login-page">
      <div className="store-login-card">
        <h2>Login Tienda</h2>
        <p className="store-login-subtitle">
          Accede como tienda / vendedor
        </p>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="store-login-input"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="store-login-input"
        />

        {error && <p className="store-login-error">{error}</p>}

        <button
          className="store-login-button"
          onClick={handleLogin}
        >
          Entrar a la Tienda
        </button>
      </div>
    </div>
  );
}