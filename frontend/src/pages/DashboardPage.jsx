import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Grid, Button,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress,
} from "@mui/material";
import { ordersApi, paymentsApi, lotsApi, logisticsApi } from "../services/api";
import StatusBadge from "../components/common/StatusBadge";
import { ORDER_STATUS_LABELS } from "../utils/constants";
import { APP_PALETTE } from "../theme/palette";

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
  const ordersById = new Map(orders.map((o) => [o.id, o]));
  const todayRevenue = payments
    .filter((p) => p.status === "confirmed" && new Date(p.created_at) >= today)
    .reduce((sum, p) => sum + Number(ordersById.get(p.order_id)?.total || 0), 0);
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
      <CircularProgress sx={{ color: APP_PALETTE.brand.primary }} />
    </Box>
  );

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700} color={APP_PALETTE.text.primary}>Dashboard</Typography>
        <Typography variant="caption" color={APP_PALETTE.text.secondary} fontWeight={600}>
          {new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </Typography>
      </Box>

      <Grid container spacing={2} mb={3}>
        {[
          { label: "Pedidos hoy", value: todayOrders.length, color: APP_PALETTE.brand.primary, icon: "📦" },
          { label: "Recaudado hoy", value: `Bs. ${todayRevenue.toFixed(2)}`, color: APP_PALETTE.status.success, icon: "💰" },
          { label: "Pagos en revisión", value: pendingPayments.length, color: APP_PALETTE.status.info, icon: "⏳" },
          { label: "Total pedidos", value: orders.length, color: APP_PALETTE.status.neutral, icon: "🗂️" },
        ].map((c) => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${c.color}` }}>
              <Typography fontSize={26} mb={1}>{c.icon}</Typography>
              <Typography fontSize={28} fontWeight={700} color={c.color}>{c.value}</Typography>
              <Typography color={APP_PALETTE.text.secondary} fontSize={13} fontWeight={600} mt={0.5}>{c.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {hasAlerts && (
        <Box mb={3}>
          <Typography fontWeight={700} fontSize={15} color={APP_PALETTE.text.primary} mb={1.5}>⚠️ Pendientes de atención</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {pendingPayments.length > 0 && (
              <AlertCard background={APP_PALETTE.surfaces.infoSoft} border={APP_PALETTE.surfaces.brandBorderSoft}>
                <Box>
                  <Typography fontWeight={600} color={APP_PALETTE.text.primary} fontSize={14}>💳 {pendingPayments.length} pago(s) esperando verificación</Typography>
                  <Typography color={APP_PALETTE.text.secondary} fontSize={12} mt={0.3}>Revisa los comprobantes subidos por los clientes</Typography>
                </Box>
                <Button component="a" href="/pagos" size="small" variant="contained" sx={{ background: APP_PALETTE.brand.primary, "&:hover": { background: APP_PALETTE.brand.primaryHover }, borderRadius: 2, fontSize: 13, textDecoration: "none" }}>Ver pagos</Button>
              </AlertCard>
            )}
            {rejectedPayments.length > 0 && (
              <AlertCard background={APP_PALETTE.surfaces.errorSoft} border={APP_PALETTE.surfaces.border}>
                <Box>
                  <Typography fontWeight={600} color={APP_PALETTE.status.error} fontSize={14}>❌ {rejectedPayments.length} pago(s) rechazado(s)</Typography>
                  <Typography color={APP_PALETTE.text.secondary} fontSize={12} mt={0.3}>Estos pedidos necesitan atención del cliente</Typography>
                </Box>
                <Button component="a" href="/pagos" size="small" variant="contained" sx={{ background: APP_PALETTE.status.error, "&:hover": { background: APP_PALETTE.text.secondary }, borderRadius: 2, fontSize: 13 }}>Ver pagos</Button>
              </AlertCard>
            )}
            {ordersWithoutLogistics.length > 0 && (
              <AlertCard background={APP_PALETTE.surfaces.warningSoft} border={APP_PALETTE.surfaces.border}>
                <Box>
                  <Typography fontWeight={600} color={APP_PALETTE.status.warning} fontSize={14}>🚚 {ordersWithoutLogistics.length} pedido(s) sin logística creada</Typography>
                  <Typography color={APP_PALETTE.text.secondary} fontSize={12} mt={0.3}>
                    {ordersWithoutLogistics.slice(0, 3).map((o) => `#${o.id} ${o.client?.full_name}`).join(" · ")}
                    {ordersWithoutLogistics.length > 3 && ` · +${ordersWithoutLogistics.length - 3} más`}
                  </Typography>
                </Box>
                <Button component="a" href="/logistica" size="small" variant="contained" sx={{ background: APP_PALETTE.status.warning, "&:hover": { background: APP_PALETTE.text.secondary }, borderRadius: 2, fontSize: 13 }}>Ver logística</Button>
              </AlertCard>
            )}
            {lowStockLots.length > 0 && (
              <AlertCard background={APP_PALETTE.surfaces.subtleAlt} border={APP_PALETTE.surfaces.border}>
                <Box>
                  <Typography fontWeight={600} color={APP_PALETTE.text.primary} fontSize={14}>🏭 {lowStockLots.length} lote(s) con menos del 10% de stock</Typography>
                  <Typography color={APP_PALETTE.text.secondary} fontSize={12} mt={0.3}>{lowStockLots.map((l) => `${l.name} (${l.units_remaining} uds)`).join(" · ")}</Typography>
                </Box>
                <Button component="a" href="/lotes" size="small" variant="contained" sx={{ background: APP_PALETTE.brand.secondary, "&:hover": { background: APP_PALETTE.brand.secondaryHover }, borderRadius: 2, fontSize: 13 }}>Ver lotes</Button>
              </AlertCard>
            )}
            {clientsMultiplePending.length > 0 && (
              <Box sx={{ background: APP_PALETTE.surfaces.successSoft, border: `1px solid ${APP_PALETTE.surfaces.border}`, borderRadius: 2.5, p: "12px 16px" }}>
                <Typography fontWeight={600} color={APP_PALETTE.text.primary} fontSize={14} mb={0.5}>👥 Clientes con múltiples pedidos pendientes de entrega</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {clientsMultiplePending.map((c) => (
                    <span key={c.name} style={{ background: APP_PALETTE.surfaces.successSoft, color: APP_PALETTE.status.success, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
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
          <Typography fontWeight={700} fontSize={15} color={APP_PALETTE.text.primary}>Pedidos recientes</Typography>
        </Box>
        <Table>
          <TableHead>
            <TableRow sx={{ background: APP_PALETTE.surfaces.subtle }}>
              {["#", "Cliente", "Total", "Estado", "Fecha"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: APP_PALETTE.text.secondary, fontSize: 13 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {recentOrders.map((o) => {
              const s = ORDER_STATUS_LABELS[o.status] || { label: o.status, color: APP_PALETTE.text.muted };
              return (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: APP_PALETTE.text.secondary }}>#{o.id}</TableCell>
                  <TableCell>{o.client?.full_name}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</TableCell>
                  <TableCell><StatusBadge label={s.label} color={s.color} /></TableCell>
                  <TableCell sx={{ color: APP_PALETTE.text.secondary, fontSize: 13, fontWeight: 600 }}>
                    {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short" })}
                  </TableCell>
                </TableRow>
              );
            })}
            {recentOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: APP_PALETTE.text.secondary, fontWeight: 600 }}>No hay pedidos aún</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}