import { useState, useEffect } from "react";
import { ordersApi, clientsApi, productsApi } from "../services/api";

const STATUS_LABELS = {
  pending_payment: { label: "Pendiente pago", color: "#f59e0b" },
  payment_in_review: { label: "Pago en revisión", color: "#3b82f6" },
  payment_confirmed: { label: "Pago confirmado", color: "#10b981" },
  payment_rejected: { label: "Pago rechazado", color: "#ef4444" },
  in_delivery: { label: "En entrega", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#059669" },
  cancelled: { label: "Cancelado", color: "#6b7280" },
};

function Badge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: "#888" };
  return (
    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", notes: "", items: [{ product_id: "", quantity: 1, unit_price: "" }] });
  const [loading, setLoading] = useState(false);

  const load = () => ordersApi.list().then((r) => setOrders(r.data));

  useEffect(() => {
    load();
    clientsApi.list().then((r) => setClients(r.data));
    productsApi.list().then((r) => setProducts(r.data));
  }, []);

  const addItem = () =>
    setForm({ ...form, items: [...form.items, { product_id: "", quantity: 1, unit_price: "" }] });

  const removeItem = (i) =>
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const updateItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    if (field === "product_id") {
      const p = products.find((p) => String(p.id) === String(val));
      if (p) items[i].unit_price = p.price;
    }
    setForm({ ...form, items });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await ordersApi.create({
        client_id: parseInt(form.client_id),
        notes: form.notes || null,
        items: form.items.map((i) => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity),
          unit_price: parseFloat(i.unit_price),
        })),
      });
      setShowForm(false);
      setForm({ client_id: "", notes: "", items: [{ product_id: "", quantity: 1, unit_price: "" }] });
      load();
    } catch {
      alert("Error al crear pedido");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
  const labelStyle = { display: "block", marginBottom: 4, fontWeight: 500, color: "#555", fontSize: 13 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Pedidos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          {showForm ? "Cancelar" : "+ Nuevo pedido"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20, color: "#333" }}>Registrar nuevo pedido</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Cliente *</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Notas</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} placeholder="Observaciones..." />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontWeight: 600, color: "#333" }}>Productos</label>
              <button
                onClick={addItem}
                style={{ padding: "4px 12px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                + Agregar
              </button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginBottom: 8, alignItems: "end" }}>
                <div>
                  <label style={labelStyle}>Producto</label>
                  <select value={item.product_id} onChange={(e) => updateItem(i, "product_id", e.target.value)} style={inputStyle}>
                    <option value="">Seleccionar</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Cantidad</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio unit. (Bs.)</label>
                  <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} style={inputStyle} />
                </div>
                <button
                  onClick={() => removeItem(i)}
                  disabled={form.items.length === 1}
                  style={{ padding: "8px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600, color: "#333" }}>
              Total: Bs. {form.items.reduce((sum, i) => sum + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0), 0).toFixed(2)}
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !form.client_id}
              style={{ padding: "10px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Guardando..." : "Registrar pedido"}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["#", "Cliente", "Productos", "Total", "Estado", "Fecha"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "12px 12px", color: "#666", fontWeight: 600 }}>#{o.id}</td>
                <td style={{ padding: "12px 12px" }}>{o.client?.full_name}</td>
                <td style={{ padding: "12px 12px", color: "#666", fontSize: 13 }}>{o.items?.length || 0} item(s)</td>
                <td style={{ padding: "12px 12px", fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</td>
                <td style={{ padding: "12px 12px" }}><Badge status={o.status} /></td>
                <td style={{ padding: "12px 12px", color: "#888", fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString("es-BO")}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#aaa" }}>No hay pedidos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}