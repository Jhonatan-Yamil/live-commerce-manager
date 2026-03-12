import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch {
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" }}>
      <div style={{ background: "#fff", padding: 40, borderRadius: 12, width: 380, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <h2 style={{ textAlign: "center", marginBottom: 8, color: "#1a1a2e" }}>LiveSale Manager</h2>
        <p style={{ textAlign: "center", color: "#666", marginBottom: 28 }}>Panel de gestión de ventas</p>
        {error && (
          <div style={{ background: "#fee", border: "1px solid #fcc", borderRadius: 6, padding: "10px 14px", marginBottom: 16, color: "#c00", fontSize: 14 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#333" }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              required
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#333" }}>Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}