import { useState, useEffect } from "react";
import { lotsApi } from "../services/api";

export default function LotsPage() {
  const [lots, setLots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", brand: "", total_units: "", total_cost: "", notes: "" });

  const load = () => lotsApi.list().then((r) => setLots(r.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    const payload = {
      ...form,
      total_units: parseInt(form.total_units),
      total_cost: parseFloat(form.total_cost),
    };
    if (editing) {
      await lotsApi.update(editing.id, payload);
    } else {
      await lotsApi.create(payload);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", brand: "", total_units: "", total_cost: "", notes: "" });
    load();
  };

  const startEdit = (l) => {
    setEditing(l);
    setForm({
      name: l.name,
      brand: l.brand,
      total_units: String(l.total_units),
      total_cost: String(l.total_cost),
      notes: l.notes || "",
    });
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
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Lotes de mercancía</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: "", brand: "", total_units: "", total_cost: "", notes: "" }); }}
          style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          {showForm ? "Cancelar" : "+ Nuevo lote"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ marginBottom: 16 }}>{editing ? "Editar lote" : "Registrar lote"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nombre del lote *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ej: Zara Enero 2026" />
            </div>
            <div>
              <label style={labelStyle}>Marca *</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={inputStyle} placeholder="Ej: Zara" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Unidades totales *</label>
                <input type="number" min="1" value={form.total_units} onChange={(e) => setForm({ ...form, total_units: e.target.value })} style={inputStyle} placeholder="100" />
              </div>
              <div>
                <label style={labelStyle}>Costo total (Bs.) *</label>
                <input type="number" step="0.01" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} style={inputStyle} placeholder="20000" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                Costo unitario estimado
              </label>
              <div style={{ padding: "8px 10px", background: "#f0f4ff", borderRadius: 6, fontSize: 14, fontWeight: 600, color: "#4f46e5" }}>
                {form.total_units && form.total_cost
                  ? `Bs. ${(parseFloat(form.total_cost) / parseInt(form.total_units)).toFixed(2)} por unidad`
                  : "—"}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, height: 60, resize: "vertical" }} placeholder="Observaciones del lote..." />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.brand || !form.total_units || !form.total_cost}
            style={{ padding: "10px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          >
            {editing ? "Guardar cambios" : "Registrar lote"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {lots.map((l) => {
          const profitColor = l.profit >= 0 ? "#10b981" : "#ef4444";
          const pctSold = l.total_units > 0 ? Math.min(100, Math.round((l.units_sold / l.total_units) * 100)) : 0;
          return (
            <div key={l.id} style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{l.name}</div>
                  <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>Marca: <strong>{l.brand}</strong></div>
                  {l.notes && <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{l.notes}</div>}
                </div>
                <button
                  onClick={() => startEdit(l)}
                  style={{ padding: "6px 14px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  Editar
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Unidades totales", value: l.total_units, suffix: "uds" },
                  { label: "Unidades vendidas", value: l.units_sold, suffix: "uds", color: "#4f46e5" },
                  { label: "Unidades restantes", value: l.units_remaining, suffix: "uds", color: l.units_remaining === 0 ? "#ef4444" : "#f59e0b" },
                  { label: "Costo unitario", value: `Bs. ${Number(l.unit_cost).toFixed(2)}`, color: "#888" },
                  { label: "Ingresos", value: `Bs. ${Number(l.total_revenue).toFixed(2)}`, color: "#10b981" },
                  { label: "Ganancia estimada", value: `Bs. ${Number(l.profit).toFixed(2)}`, color: profitColor },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: "#f8f9fc", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: stat.color || "#1a1a2e" }}>
                      {typeof stat.value === "number" ? `${stat.value} ${stat.suffix}` : stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>Progreso de ventas</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4f46e5" }}>{pctSold}%</span>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 20, height: 8 }}>
                  <div style={{ width: `${pctSold}%`, background: "#4f46e5", borderRadius: 20, height: 8, transition: "width 0.3s" }} />
                </div>
              </div>
            </div>
          );
        })}
        {lots.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, textAlign: "center", color: "#aaa" }}>
            No hay lotes registrados
          </div>
        )}
      </div>
    </div>
  );
}