import { useState, useEffect } from "react";
import { clientsApi } from "../services/api";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", notes: "" });

  const load = () => clientsApi.list().then((r) => setClients(r.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (editing) {
      await clientsApi.update(editing.id, form);
    } else {
      await clientsApi.create(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ full_name: "", phone: "", address: "", notes: "" });
    load();
  };

  const startEdit = (c) => {
    setEditing(c);
    setForm({ full_name: c.full_name, phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
    setShowForm(true);
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  };
  const labelStyle = { display: "block", marginBottom: 4, fontWeight: 500, color: "#555", fontSize: 13 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Clientes</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm({ full_name: "", phone: "", address: "", notes: "" });
          }}
          style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          {showForm ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ marginBottom: 16 }}>{editing ? "Editar cliente" : "Registrar cliente"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Teléfono / WhatsApp</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
                placeholder="+591 7..."
              />
            </div>
            <div>
              <label style={labelStyle}>Dirección</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Notas</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!form.full_name}
            style={{ padding: "10px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          >
            {editing ? "Guardar cambios" : "Registrar"}
          </button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["Nombre", "Teléfono", "Dirección", "Notas", "Acciones"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "12px 12px", fontWeight: 600 }}>{c.full_name}</td>
                <td style={{ padding: "12px 12px", color: "#666" }}>{c.phone || "—"}</td>
                <td style={{ padding: "12px 12px", color: "#666" }}>{c.address || "—"}</td>
                <td style={{ padding: "12px 12px", color: "#888", fontSize: 13 }}>{c.notes || "—"}</td>
                <td style={{ padding: "12px 12px" }}>
                  <button
                    onClick={() => startEdit(c)}
                    style={{ padding: "5px 12px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#aaa" }}>
                  No hay clientes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}