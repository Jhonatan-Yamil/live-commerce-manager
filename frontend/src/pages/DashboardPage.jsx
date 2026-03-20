import { useState, useEffect } from "react";
import { ordersApi, paymentsApi, clientsApi, lotsApi, logisticsApi } from "../services/api";

const STATUS_LABELS = {
  pending_payment: { label: "Pendiente pago", color: "#f59e0b" },
  payment_in_review: { label: "Pago en revisión", color: "#3b82f6" },
  payment_confirmed: { label: "Pago confirmado", color: "#10b981" },
  payment_rejected: { label: "Pago rechazado", color: "#ef4444" },
  in_delivery: { label: "En entrega", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#059669" },
  cancelled: { label: "Cancelado", color: "#6b7280" },
};

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lots, setLots] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersApi.list(),
      paymentsApi.list(),
      lotsApi.list(),
      logisticsApi.list(),
    ]).then(([ordersRes, paymentsRes, lotsRes, logisticsRes]) => {
      setOrders(ordersRes.data);
      setPayments(paymentsRes.data);
      setLots(lotsRes.data);
      setLogistics(logisticsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.created_at) >= today);
  const todayRevenue = todayOrders
    .filter((o) => o.status === "payment_confirmed")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const pendingPayments = payments.filter((p) => p.status === "in_review");
  const rejectedPayments = payments.filter((p) => p.status === "rejected");

  const logisticsOrderIds = new Set(logistics.map((l) => l.order_id));
  const ordersWithoutLogistics = orders.filter(
    (o) => o.status === "payment_confirmed" && !logisticsOrderIds.has(o.id)
  );

  const lowStockLots = lots.filter(
    (l) => l.total_units > 0 && l.units_remaining / l.total_units < 0.1
  );

  const clientPendingMap = {};
  logistics
    .filter((l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed")
    .forEach((l) => {
      const order = orders.find((o) => o.id === l.order_id);
      if (order?.client) {
        const key = order.client_id;
        if (!clientPendingMap[key]) {
          clientPendingMap[key] = { name: order.client.full_name, count: 0 };
        }
        clientPendingMap[key].count++;
      }
    });
  const clientsMultiplePending = Object.values(clientPendingMap).filter((c) => c.count > 1);

  const recentOrders = [...orders].reverse().slice(0, 5);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Cargando...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#1a1a2e", margin: 0 }}>Dashboard</h2>
        <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Resumen del día */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Pedidos hoy", value: todayOrders.length, color: "#4f46e5", icon: "📦" },
          { label: "Recaudado hoy", value: `Bs. ${todayRevenue.toFixed(2)}`, color: "#059669", icon: "💰" },
          { label: "Pagos en revisión", value: pendingPayments.length, color: "#3b82f6", icon: "⏳" },
          { label: "Total pedidos", value: orders.length, color: "#0891b2", icon: "🗂️" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {(pendingPayments.length > 0 || rejectedPayments.length > 0 || ordersWithoutLogistics.length > 0 || lowStockLots.length > 0 || clientsMultiplePending.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: "#1a1a2e", marginBottom: 12, fontSize: 15 }}>⚠️ Pendientes de atención</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {pendingPayments.length > 0 && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#1d4ed8" }}>💳 {pendingPayments.length} pago(s) esperando verificación</span>
                  <div style={{ color: "#3b82f6", fontSize: 12, marginTop: 2 }}>Revisa los comprobantes subidos por los clientes</div>
                </div>
                <a href="/pagos" style={{ padding: "6px 14px", background: "#3b82f6", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver pagos</a>
              </div>
            )}

            {rejectedPayments.length > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#dc2626" }}>❌ {rejectedPayments.length} pago(s) rechazado(s)</span>
                  <div style={{ color: "#ef4444", fontSize: 12, marginTop: 2 }}>Estos pedidos necesitan atención del cliente</div>
                </div>
                <a href="/pagos" style={{ padding: "6px 14px", background: "#ef4444", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver pagos</a>
              </div>
            )}

            {ordersWithoutLogistics.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#d97706" }}>🚚 {ordersWithoutLogistics.length} pedido(s) sin logística creada</span>
                  <div style={{ color: "#f59e0b", fontSize: 12, marginTop: 2 }}>
                    {ordersWithoutLogistics.slice(0, 3).map((o) => `#${o.id} ${o.client?.full_name}`).join(" · ")}
                    {ordersWithoutLogistics.length > 3 && ` · +${ordersWithoutLogistics.length - 3} más`}
                  </div>
                </div>
                <a href="/logistica" style={{ padding: "6px 14px", background: "#f59e0b", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver logística</a>
              </div>
            )}

            {lowStockLots.length > 0 && (
              <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#7c3aed" }}>🏭 {lowStockLots.length} lote(s) con menos del 10% de stock</span>
                  <div style={{ color: "#8b5cf6", fontSize: 12, marginTop: 2 }}>
                    {lowStockLots.map((l) => `${l.name} (${l.units_remaining} uds)`).join(" · ")}
                  </div>
                </div>
                <a href="/lotes" style={{ padding: "6px 14px", background: "#8b5cf6", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver lotes</a>
              </div>
            )}

            {clientsMultiplePending.length > 0 && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px" }}>
                <span style={{ fontWeight: 600, color: "#15803d" }}>👥 Clientes con múltiples pedidos pendientes de entrega</span>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {clientsMultiplePending.map((c) => (
                    <span key={c.name} style={{ background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                      {c.name} — {c.count} pedidos
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Pedidos recientes */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <h3 style={{ marginBottom: 16, color: "#333", fontSize: 15 }}>Pedidos recientes</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["#", "Cliente", "Total", "Estado", "Fecha"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => {
              const s = STATUS_LABELS[o.status] || { label: o.status, color: "#888" };
              return (
                <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "10px 12px", color: "#666", fontWeight: 600 }}>#{o.id}</td>
                  <td style={{ padding: "10px 12px" }}>{o.client?.full_name}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#888", fontSize: 13 }}>
                    {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              );
            })}
            {recentOrders.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#aaa" }}>No hay pedidos aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}