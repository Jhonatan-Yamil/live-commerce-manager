import { useState } from "react";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { logisticsApi } from "../../services/api";
import { APP_PALETTE } from "../../theme/palette";

export default function PrepareDeliveryMode({ orders, logistics, onUpdate }) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const pendingLogistics = logistics.filter(
    (l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed"
  );
  const pendingOrderIds = new Set(pendingLogistics.map((l) => l.order_id));

  const clientsWithPending = {};
  orders.forEach((o) => {
    if (pendingOrderIds.has(o.id) && o.client) {
      if (!clientsWithPending[o.client_id]) {
        clientsWithPending[o.client_id] = { id: o.client_id, name: o.client.full_name, orders: [] };
      }
      clientsWithPending[o.client_id].orders.push(o);
    }
  });

  const clientList = Object.values(clientsWithPending).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getLogisticsForOrder = (orderId) => logistics.find((l) => l.order_id === orderId);

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
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
      <Typography variant="h6" fontWeight={700} color={APP_PALETTE.text.primary} mb={0.5}>Modo preparacion de entregas</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Busca un cliente para ver todos sus pedidos pendientes y marcarlos como entregados
      </Typography>

      <TextField
        size="small"
        fullWidth
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedClient(null);
        }}
        sx={{ mb: 1.5 }}
      />

      {search && !selectedClient && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 1.5 }}>
          {clientList.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ p: 1.5, display: "block" }}>
              No se encontraron clientes con pedidos pendientes
            </Typography>
          ) : (
            clientList.map((c) => (
              <Box
                key={c.id}
                onClick={() => {
                  setSelectedClient(c);
                  setSearch(c.name);
                }}
                sx={{
                  p: 1.5,
                  cursor: "pointer",
                  borderBottom: `1px solid ${APP_PALETTE.surfaces.borderSoft}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  "&:hover": { background: APP_PALETTE.brand.soft },
                }}
              >
                <Typography fontWeight={600}>{c.name}</Typography>
                <span
                  style={{
                    background: APP_PALETTE.surfaces.warningSoft,
                    color: APP_PALETTE.status.warning,
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {c.orders.length} pedido(s) pendiente(s)
                </span>
              </Box>
            ))
          )}
        </Paper>
      )}

      {selectedClient && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box>
              <Typography fontWeight={700} fontSize={15} display="inline">{selectedClient.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {selectedClient.orders.length} pedido(s) pendiente(s)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleMarkAllDelivered(selectedClient)}
                sx={{ background: APP_PALETTE.status.success, "&:hover": { background: APP_PALETTE.brand.primary }, borderRadius: 2, fontSize: 12 }}
              >
                Marcar todos como entregados
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSelectedClient(null);
                  setSearch("");
                }}
                sx={{ color: APP_PALETTE.text.secondary, borderColor: APP_PALETTE.surfaces.border, borderRadius: 2 }}
              >
                Limpiar
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {selectedClient.orders.map((o) => {
              const log = getLogisticsForOrder(o.id);
              const isDelivered = log?.delivery_status === "delivered";

              return (
                <Box
                  key={o.id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 2,
                    background: isDelivered ? APP_PALETTE.surfaces.successSoft : APP_PALETTE.surfaces.subtle,
                    border: `1px solid ${isDelivered ? APP_PALETTE.status.success : APP_PALETTE.surfaces.border}`,
                  }}
                >
                  <Box>
                    <Typography fontWeight={600} display="inline">Pedido #{o.id}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {new Date(o.created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                    </Typography>
                    <Typography variant="caption" fontWeight={600} color={APP_PALETTE.brand.primary} sx={{ ml: 1 }}>
                      Bs. {Number(o.total).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {o.items?.length || 0} item(s)
                    </Typography>
                  </Box>

                  {isDelivered ? (
                    <span
                      style={{
                        background: APP_PALETTE.surfaces.successSoft,
                        color: APP_PALETTE.status.success,
                        borderRadius: 20,
                        padding: "4px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Entregado
                    </span>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleMarkDelivered(log.id)}
                      sx={{ background: APP_PALETTE.status.success, "&:hover": { background: APP_PALETTE.brand.primary }, borderRadius: 2, fontSize: 12 }}
                    >
                      Marcar entregado
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
