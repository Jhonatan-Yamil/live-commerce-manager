import { useState, useEffect, useRef } from "react";
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

function PrepareDeliveryMode({ orders, logistics, onUpdate }) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const ref = useRef(null);

  const pendingLogistics = logistics.filter(
    (l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed"
  );
  const pendingOrderIds = new Set(pendingLogistics.map((l) => l.order_id));

  const clientsWithPending = {};
  orders.forEach((o) => {
    if (pendingOrderIds.has(o.id) && o.client) {
      if (!clientsWithPending[o.client_id]) {
        clientsWithPending[o.client_id] = {
          id: o.client_id,
          name: o.client.full_name,
          orders: [],
        };
      }
      clientsWithPending[o.client_id].orders.push(o);
    }
  });

  const clientList = Object.values(clientsWithPending).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getLogisticsForOrder = (orderId) =>
    logistics.find((l) => l.order_id === orderId);

  const handleMarkDelivered = async (logisticsId) => {
    await logisticsApi.update(logisticsId, { delivery_status: "delivered" });
    onUpdate();
  };

  const handleMarkAllDelivered = async (client) => {
    for (const order of client.orders) {
      const log = getLogisticsForOrder(order.id);
      if (log && log.delivery_status !== "delivered") {
        await logisticsApi.update(log.id, { delivery_status: "delivered" });
      }
    }
    setSelectedClient(null);
    onUpdate();
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
      <h3 style={{ marginBottom: 4, color: "#1a1a2e" }}>🗓️ Modo preparación de entregas</h3>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
        Busca un cliente para ver todos sus pedidos pendientes y marcarlos como entregados
      </p>

      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }}
        placeholder="Buscar cliente..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box", marginBottom: 12 }}
      />

      {search && !selectedClient && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
          {clientList.length === 0 ? (
            <div style={{ padding: 12, color: "#aaa", fontSize: 13 }}>No se encontraron clientes con pedidos pendientes</div>
          ) : (
            clientList.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedClient(c); setSearch(c.name); }}
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f0f4ff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
              >
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                  {c.orders.length} pedido(s) pendiente(s)
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {selectedClient && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedClient.name}</span>
              <span style={{ marginLeft: 8, color: "#888", fontSize: 13 }}>
                {selectedClient.orders.length} pedido(s) pendiente(s)
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleMarkAllDelivered(selectedClient)}
                style={{ padding: "7px 14px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                ✓ Marcar todos como entregados
              </button>
              <button
                onClick={() => { setSelectedClient(null); setSearch(""); }}
                style={{ padding: "7px 14px", background: "#f0f0f0", color: "#666", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                Limpiar
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedClient.orders.map((o) => {
              const log = getLogisticsForOrder(o.id);
              const isDelivered = log?.delivery_status === "delivered";
              return (
                <div
                  key={o.id}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 8, background: isDelivered ? "#f0fdf4" : "#f8f9fc", border: `1px solid ${isDelivered ? "#86efac" : "#e5e7eb"}` }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>Pedido #{o.id}</span>
                    <span style={{ marginLeft: 8, color: "#888", fontSize: 13 }}>
                      {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span style={{ marginLeft: 8, fontWeight: 600, color: "#4f46e5" }}>
                      Bs. {Number(o.total).toFixed(2)}
                    </span>
                    <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>
                      {o.items?.length || 0} ítem(s)
                    </span>
                  </div>
                  <div>
                    {isDelivered ? (
                      <span style={{ background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                        ✓ Entregado
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkDelivered(log.id)}
                        style={{ padding: "6px 14px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                      >
                        Marcar entregado
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LogisticsPage() {
  const [logistics, setLogistics] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ selected_orders: [], delivery_type: "pickup", address: "" });
  const [editing, setEditing] = useState({});
  const [orderSearch, setOrderSearch] = useState("");

  const load = () => {
    logisticsApi.list().then((r) => setLogistics(r.data));
    ordersApi.list().then((r) => setOrders(r.data));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.selected_orders?.length) return alert("Selecciona al menos un pedido");
    for (const orderId of form.selected_orders) {
      await logisticsApi.create({
        order_id: orderId,
        delivery_type: form.delivery_type,
        address: form.address || null,
      });
    }
    setShowForm(false);
    setForm({ selected_orders: [], delivery_type: "pickup", address: "" });
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

  const filteredAvailableOrders = availableOrders.filter((o) => {
    const search = orderSearch.toLowerCase();
    return (
      String(o.id).includes(search) ||
      (o.client?.full_name || "").toLowerCase().includes(search)
    );
  });

  const getPendingOrdersByClient = (clientId) => {
    const clientOrders = orders.filter((o) => o.client_id === clientId);
    const pendingLogisticsOrderIds = logistics
      .filter((l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed")
      .map((l) => l.order_id);
    return clientOrders.filter((o) => pendingLogisticsOrderIds.includes(o.id));
  };

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
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                Seleccionar pedidos a entregar (pago confirmado)
                <span style={{ marginLeft: 8, color: "#888", fontWeight: 400 }}>
                  — puedes seleccionar varios
                </span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid #ddd", borderRadius: 6, padding: 8 }}>
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Buscar por nombre de cliente o # de pedido..."
                  style={{ ...inputStyle, marginBottom: 4 }}
                />
                <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredAvailableOrders.length === 0 ? (
                  <div style={{ color: "#aaa", fontSize: 13, padding: 8 }}>
                    {orderSearch ? "No se encontraron pedidos" : "No hay pedidos con pago confirmado pendientes de entrega"}
                  </div>
                ) : (
                  filteredAvailableOrders.map((o) => {
                    const isSelected = form.selected_orders?.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: isSelected ? "#e0e7ff" : "#fff", border: `1px solid ${isSelected ? "#4f46e5" : "#f0f0f0"}` }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const current = form.selected_orders || [];
                            const updated = isSelected
                              ? current.filter((id) => id !== o.id)
                              : [...current, o.id];
                            setForm({ ...form, selected_orders: updated });
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>#{o.id}</span>
                          <span style={{ marginLeft: 8 }}>{o.client?.full_name}</span>
                          <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>
                            {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span style={{ marginLeft: 8, fontWeight: 600, color: "#4f46e5", fontSize: 13 }}>
                            Bs. {Number(o.total).toFixed(2)}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
                </div>
              </div>
              {form.selected_orders?.length > 0 && (
                <div style={{ marginTop: 8, color: "#4f46e5", fontSize: 13, fontWeight: 600 }}>
                  {form.selected_orders.length} pedido(s) seleccionado(s)
                </div>
              )}
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
            disabled={!form.selected_orders?.length}
            style={{ padding: "10px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          >
            Crear registro
          </button>
        </div>
      )}

      <PrepareDeliveryMode
        orders={orders}
        logistics={logistics}
        onUpdate={load}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {logistics.map((l) => {
          const s = DELIVERY_STATUS[l.delivery_status];
          const t = DELIVERY_TYPE_LABELS[l.delivery_type];
          const relatedOrder = orders.find((o) => o.id === l.order_id);
          const clientId = relatedOrder?.client_id;
          const clientName = relatedOrder?.client?.full_name;
          const pendingOrders = clientId ? getPendingOrdersByClient(clientId) : [];
          const isEditing = !!editing[l.id];
          return (
            <div
              key={l.id}
              style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.color}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      Pedido #{l.order_id}
                      {clientName && (
                        <span style={{ marginLeft: 8, color: "#555", fontWeight: 500, fontSize: 14 }}>
                          — {clientName}
                        </span>
                      )}
                      {relatedOrder && (
                        <span style={{ marginLeft: 8, color: "#aaa", fontSize: 12, fontWeight: 400 }}>
                          {new Date(relatedOrder.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                        {s.label}
                      </span>
                      <span style={{ color: "#888", fontSize: 12 }}>
                        {t.icon} {t.label}
                      </span>
                      {pendingOrders.length > 1 && (
                        <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                          ⚠️ Este cliente tiene {pendingOrders.length} pedidos pendientes de entrega
                        </span>
                      )}
                      {pendingOrders.length === 1 && (
                        <span style={{ background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                          ✓ Único pedido pendiente
                        </span>
                      )}
                    </div>
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