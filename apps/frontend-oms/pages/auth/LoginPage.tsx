import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();

  function loginAs(role: "ADMIN" | "STORE") {
    localStorage.setItem("role", role);

    if (role === "ADMIN") {
      navigate("/panel");
    } else {
      navigate("/tienda");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f6f7fb",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 10,
          width: 320,
          boxShadow: "0 10px 25px rgba(0,0,0,.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Login (Mock)</h2>
        <p style={{ opacity: 0.7, fontSize: 14 }}>
          Simulación sin backend
        </p>

        <button
          style={{ width: "100%", marginBottom: 10 }}
          onClick={() => loginAs("ADMIN")}
        >
          Entrar como Admin
        </button>

        <button
          style={{ width: "100%" }}
          onClick={() => loginAs("STORE")}
        >
          Entrar como Tienda
        </button>
      </div>
    </div>
  );
}
