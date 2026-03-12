import { useState, useEffect } from "react";
import { productsApi } from "../services/api";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", stock: 0 });

  const load = () => productsApi.list().then((r) => setProducts(r.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) };
    if (editing) {
      await productsApi.update(editing.id, payload);
    } else {
      await productsApi.create(payload);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", description: "", price: "", stock: 0 });
    load();
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", price: String(p.price), stock: p.stock });
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
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Productos</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm({ name: "", description: "", price: "", stock: 0 });
          }}
          style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          {showForm ? "Cancelar" : "+ Nuevo producto"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ marginBottom: 16 }}>{editing ? "Editar producto" : "Registrar producto"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Precio (Bs.) *</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Stock</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, height: 70, resize: "vertical" }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.price}
            style={{ padding: "10px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          >
            {editing ? "Guardar cambios" : "Registrar"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{p.name}</div>
            {p.description && (
              <div style={{ color: "#666", fontSize: 13, marginBottom: 10 }}>{p.description}</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#4f46e5" }}>Bs. {Number(p.price).toFixed(2)}</div>
                <div style={{ color: "#888", fontSize: 12 }}>Stock: {p.stock}</div>
              </div>
              <button
                onClick={() => startEdit(p)}
                style={{ padding: "6px 14px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Editar
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div style={{ gridColumn: "1/-1", background: "#fff", borderRadius: 12, padding: 32, textAlign: "center", color: "#aaa" }}>
            No hay productos registrados
          </div>
        )}
      </div>
    </div>
  );
}