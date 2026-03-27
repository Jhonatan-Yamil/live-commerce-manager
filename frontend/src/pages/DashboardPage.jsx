import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Grid, Button,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress,
} from "@mui/material";
import { ordersApi, paymentsApi, lotsApi, logisticsApi } from "../services/api";

const STATUS_LABELS = {
  pending_payment: { label: "Pendiente pago", color: "#f59e0b" },
  payment_in_review: { label: "Pago en revisión", color: "#3b82f6" },
  payment_confirmed: { label: "Pago confirmado", color: "#10b981" },
  payment_rejected: { label: "Pago rechazado", color: "#ef4444" },
  in_delivery: { label: "En entrega", color: "#8b5cf6" },
  delivered: { label: "Entregado", color: "#059669" },
  cancelled: { label: "Cancelado", color: "#6b7280" },
};

function AlertCard({ background, border, children }) {
  return (
    <Box sx={{ background, border: `1px solid ${border}`, borderRadius: 2.5, p: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
      {children}
    </Box>
  );
}

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lots, setLots] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([ordersApi.list(), paymentsApi.list(), lotsApi.list(), logisticsApi.list()])
      .then(([o, p, l, lg]) => { setOrders(o.data); setPayments(p.data); setLots(l.data); setLogistics(lg.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.created_at) >= today);
  const todayRevenue = todayOrders.filter((o) => o.status === "payment_confirmed").reduce((sum, o) => sum + Number(o.total), 0);
  const pendingPayments = payments.filter((p) => p.status === "in_review");
  const rejectedPayments = payments.filter((p) => p.status === "rejected");
  const logisticsOrderIds = new Set(logistics.map((l) => l.order_id));
  const ordersWithoutLogistics = orders.filter((o) => o.status === "payment_confirmed" && !logisticsOrderIds.has(o.id));
  const lowStockLots = lots.filter((l) => l.total_units > 0 && l.units_remaining / l.total_units < 0.1);

  const clientPendingMap = {};
  logistics.filter((l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed").forEach((l) => {
    const order = orders.find((o) => o.id === l.order_id);
    if (order?.client) {
      const key = order.client_id;
      if (!clientPendingMap[key]) clientPendingMap[key] = { name: order.client.full_name, count: 0 };
      clientPendingMap[key].count++;
    }
  });
  const clientsMultiplePending = Object.values(clientPendingMap).filter((c) => c.count > 1);
  const recentOrders = [...orders].reverse().slice(0, 5);
  const hasAlerts = pendingPayments.length > 0 || rejectedPayments.length > 0 || ordersWithoutLogistics.length > 0 || lowStockLots.length > 0 || clientsMultiplePending.length > 0;

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
      <CircularProgress sx={{ color: "#4f46e5" }} />
    </Box>
  );

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700} color="#1a1a2e">Dashboard</Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </Typography>
      </Box>

      <Grid container spacing={2} mb={3}>
        {[
          { label: "Pedidos hoy", value: todayOrders.length, color: "#4f46e5", icon: "📦" },
          { label: "Recaudado hoy", value: `Bs. ${todayRevenue.toFixed(2)}`, color: "#059669", icon: "💰" },
          { label: "Pagos en revisión", value: pendingPayments.length, color: "#3b82f6", icon: "⏳" },
          { label: "Total pedidos", value: orders.length, color: "#0891b2", icon: "🗂️" },
        ].map((c) => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${c.color}` }}>
              <Typography fontSize={26} mb={1}>{c.icon}</Typography>
              <Typography fontSize={28} fontWeight={700} color={c.color}>{c.value}</Typography>
              <Typography color="text.secondary" fontSize={13} mt={0.5}>{c.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {hasAlerts && (
        <Box mb={3}>
          <Typography fontWeight={700} fontSize={15} color="#1a1a2e" mb={1.5}>⚠️ Pendientes de atención</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {pendingPayments.length > 0 && (
              <AlertCard background="#eff6ff" border="#bfdbfe">
                <Box>
                  <Typography fontWeight={600} color="#1d4ed8" fontSize={14}>💳 {pendingPayments.length} pago(s) esperando verificación</Typography>
                  <Typography color="#3b82f6" fontSize={12} mt={0.3}>Revisa los comprobantes subidos por los clientes</Typography>
                </Box>
                <Button component="a" href="/pagos" size="small" variant="contained" sx={{ background: "#3b82f6", "&:hover": { background: "#2563eb" }, borderRadius: 2, fontSize: 13, textDecoration: "none" }}>Ver pagos</Button>
              </AlertCard>
            )}
            {rejectedPayments.length > 0 && (
              <AlertCard background="#fef2f2" border="#fecaca">
                <Box>
                  <Typography fontWeight={600} color="#dc2626" fontSize={14}>❌ {rejectedPayments.length} pago(s) rechazado(s)</Typography>
                  <Typography color="#ef4444" fontSize={12} mt={0.3}>Estos pedidos necesitan atención del cliente</Typography>
                </Box>
                <Button component="a" href="/pagos" size="small" variant="contained" sx={{ background: "#ef4444", "&:hover": { background: "#dc2626" }, borderRadius: 2, fontSize: 13 }}>Ver pagos</Button>
              </AlertCard>
            )}
            {ordersWithoutLogistics.length > 0 && (
              <AlertCard background="#fffbeb" border="#fde68a">
                <Box>
                  <Typography fontWeight={600} color="#d97706" fontSize={14}>🚚 {ordersWithoutLogistics.length} pedido(s) sin logística creada</Typography>
                  <Typography color="#f59e0b" fontSize={12} mt={0.3}>
                    {ordersWithoutLogistics.slice(0, 3).map((o) => `#${o.id} ${o.client?.full_name}`).join(" · ")}
                    {ordersWithoutLogistics.length > 3 && ` · +${ordersWithoutLogistics.length - 3} más`}
                  </Typography>
                </Box>
                <Button component="a" href="/logistica" size="small" variant="contained" sx={{ background: "#f59e0b", "&:hover": { background: "#d97706" }, borderRadius: 2, fontSize: 13 }}>Ver logística</Button>
              </AlertCard>
            )}
            {lowStockLots.length > 0 && (
              <AlertCard background="#fdf4ff" border="#e9d5ff">
                <Box>
                  <Typography fontWeight={600} color="#7c3aed" fontSize={14}>🏭 {lowStockLots.length} lote(s) con menos del 10% de stock</Typography>
                  <Typography color="#8b5cf6" fontSize={12} mt={0.3}>{lowStockLots.map((l) => `${l.name} (${l.units_remaining} uds)`).join(" · ")}</Typography>
                </Box>
                <Button component="a" href="/lotes" size="small" variant="contained" sx={{ background: "#8b5cf6", "&:hover": { background: "#7c3aed" }, borderRadius: 2, fontSize: 13 }}>Ver lotes</Button>
              </AlertCard>
            )}
            {clientsMultiplePending.length > 0 && (
              <Box sx={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2.5, p: "12px 16px" }}>
                <Typography fontWeight={600} color="#15803d" fontSize={14} mb={0.5}>👥 Clientes con múltiples pedidos pendientes de entrega</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {clientsMultiplePending.map((c) => (
                    <span key={c.name} style={{ background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                      {c.name} — {c.count} pedidos
                    </span>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <Box sx={{ p: 2.5, pb: 1 }}>
          <Typography fontWeight={700} fontSize={15} color="#333">Pedidos recientes</Typography>
        </Box>
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#f8f9fc" }}>
              {["#", "Cliente", "Total", "Estado", "Fecha"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "#888", fontSize: 13 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {recentOrders.map((o) => {
              const s = STATUS_LABELS[o.status] || { label: o.status, color: "#888" };
              return (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: "#666" }}>#{o.id}</TableCell>
                  <TableCell>{o.client?.full_name}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                  </TableCell>
                  <TableCell sx={{ color: "#888", fontSize: 13 }}>
                    {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short" })}
                  </TableCell>
                </TableRow>
              );
            })}
            {recentOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#aaa" }}>No hay pedidos aún</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}