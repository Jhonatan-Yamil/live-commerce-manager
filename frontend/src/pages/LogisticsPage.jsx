import { useState, useEffect } from "react";
import { logisticsApi, ordersApi } from "../services/api";

const DELIVERY_TYPE_LABELS = {
  pickup: { label: "Retiro en tienda", icon: "🏪" },
  shipping: { label: "Envío a otra ciudad", icon: "🚚" },
  coordinated: { label: "Entrega coordinada", icon: "📍" },
};

const DELIVERY_STATUS = {
  in_store: { label: "En tienda", color: "#f59e0b" },
  sent: { label: "Enviado", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#10b981" },
  failed: { label: "Fallido", color: "#ef4444" },
};

export default function LogisticsPage() {
  const [logistics, setLogistics] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ order_id: "", delivery_type: "pickup", address: "" });
  const [editing, setEditing] = useState({});

  const load = () => {
    logisticsApi.list().then((r) => setLogistics(r.data));
    ordersApi.list().then((r) => setOrders(r.data));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await logisticsApi.create({ ...form, order_id: parseInt(form.order_id) });
    setShowForm(false);
    setForm({ order_id: "", delivery_type: "pickup", address: "" });
    load();
  };

  const handleUpdate = async (id) => {
    await logisticsApi.update(id, editing[id]);
    setEditing({ ...editing, [id]: null });
    load();
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  };

  const logisticsOrderIds = new Set(logistics.map((l) => l.order_id));
  const availableOrders = orders.filter(
    (o) => !logisticsOrderIds.has(o.id) && o.status === "payment_confirmed"
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Logística</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          {showForm ? "Cancelar" : "+ Nuevo envío"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ marginBottom: 16 }}>Crear registro de entrega</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
                Pedido (pago confirmado)
              </label>
              <select
                value={form.order_id}
                onChange={(e) => setForm({ ...form, order_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">Seleccionar pedido</option>
                {availableOrders.map((o) => (
                  <option key={o.id} value={o.id}>#{o.id} — {o.client?.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
                Tipo de entrega
              </label>
              <select
                value={form.delivery_type}
                onChange={(e) => setForm({ ...form, delivery_type: e.target.value })}
                style={inputStyle}
              >
                <option value="pickup">🏪 Retiro en tienda</option>
                <option value="shipping">🚚 Envío a otra ciudad</option>
                <option value="coordinated">📍 Entrega coordinada</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
                Dirección / Punto de encuentro
              </label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                style={inputStyle}
                placeholder={form.delivery_type === "pickup" ? "Dirección de la tienda" : form.delivery_type === "shipping" ? "Ciudad de destino" : "Punto de encuentro"}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!form.order_id}
            style={{ padding: "10px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          >
            Crear registro
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {logistics.map((l) => {
          const s = DELIVERY_STATUS[l.delivery_status];
          const t = DELIVERY_TYPE_LABELS[l.delivery_type];
          const isEditing = !!editing[l.id];
          return (
            <div
              key={l.id}
              style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.color}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                    Pedido #{l.order_id}
                    <span style={{ marginLeft: 10, background: s.color + "20", color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                      {s.label}
                    </span>
                    <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>
                      {t.icon} {t.label}
                    </span>
                  </div>
                  {l.address && (
                    <div style={{ fontSize: 13, color: "#666" }}>📍 {l.address}</div>
                  )}
                  {l.tracking_notes && (
                    <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>📝 {l.tracking_notes}</div>
                  )}
                </div>
                <div>
                  {!isEditing ? (
                    <button
                      onClick={() => setEditing({ ...editing, [l.id]: { delivery_status: l.delivery_status, tracking_notes: l.tracking_notes || "", address: l.address || "" } })}
                      style={{ padding: "6px 14px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      Actualizar
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 300 }}>
                      <select
                        value={editing[l.id].delivery_status}
                        onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], delivery_status: e.target.value } })}
                        style={{ ...inputStyle, padding: "6px 8px" }}
                      >
                        <option value="in_store">En tienda</option>
                        <option value="sent">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="failed">Fallido</option>
                      </select>
                      <input
                        placeholder="Notas de seguimiento"
                        value={editing[l.id].tracking_notes}
                        onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], tracking_notes: e.target.value } })}
                        style={{ ...inputStyle, padding: "6px 8px" }}
                      />
                      <input
                        placeholder="Dirección / Punto de encuentro"
                        value={editing[l.id].address}
                        onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], address: e.target.value } })}
                        style={{ ...inputStyle, padding: "6px 8px" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleUpdate(l.id)}
                          style={{ flex: 1, padding: "6px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditing({ ...editing, [l.id]: null })}
                          style={{ flex: 1, padding: "6px", background: "#f0f0f0", color: "#666", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {logistics.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, textAlign: "center", color: "#aaa" }}>
            No hay registros de logística
          </div>
        )}
      </div>
    </div>
  );
}