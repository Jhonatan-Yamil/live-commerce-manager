import { useState, useEffect } from "react";
import { ordersApi, paymentsApi, clientsApi, productsApi } from "../services/api";

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
  const [stats, setStats] = useState({ orders: 0, clients: 0, products: 0, pendingPayments: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    Promise.all([ordersApi.list(), clientsApi.list(), productsApi.list(), paymentsApi.list()])
      .then(([orders, clients, products, payments]) => {
        setStats({
          orders: orders.data.length,
          clients: clients.data.length,
          products: products.data.length,
          pendingPayments: payments.data.filter((p) => p.status === "in_review").length,
        });
        setRecentOrders(orders.data.slice(-5).reverse());
      })
      .catch(console.error);
  }, []);

  const cards = [
    { label: "Total pedidos", value: stats.orders, color: "#4f46e5", icon: "📦" },
    { label: "Clientes", value: stats.clients, color: "#0891b2", icon: "👥" },
    { label: "Productos", value: stats.products, color: "#059669", icon: "🏷️" },
    { label: "Pagos en revisión", value: stats.pendingPayments, color: "#d97706", icon: "⏳" },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24, color: "#1a1a2e" }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <h3 style={{ marginBottom: 16, color: "#333" }}>Pedidos recientes</h3>
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
                  <td style={{ padding: "10px 12px", color: "#666" }}>#{o.id}</td>
                  <td style={{ padding: "10px 12px" }}>{o.client?.full_name}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#888", fontSize: 13 }}>
                    {new Date(o.created_at).toLocaleDateString("es-BO")}
                  </td>
                </tr>
              );
            })}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#aaa" }}>No hay pedidos aún</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}