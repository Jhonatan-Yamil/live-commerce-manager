import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import StatusBadge from "../common/StatusBadge";
import { DELIVERY_STATUS, DELIVERY_TYPE_LABELS } from "../../utils/constants";
import { APP_PALETTE } from "../../theme/palette";

export default function LogisticsRecordCard({
  item,
  relatedOrder,
  pendingOrders,
  editValue,
  onStartEdit,
  onCancelEdit,
  onEditField,
  onSave,
}) {
  const status = DELIVERY_STATUS[item.delivery_status];
  const deliveryType = DELIVERY_TYPE_LABELS[item.delivery_type];
  const isEditing = Boolean(editValue);

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
        borderLeft: `4px solid ${status.color}`,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box mb={0.5}>
            <Typography fontWeight={700} fontSize={15} display="inline">
              Pedido #{item.order_id}
            </Typography>
            {relatedOrder?.client?.full_name && (
              <Typography display="inline" color={APP_PALETTE.text.secondary} fontWeight={500} fontSize={14} sx={{ ml: 1 }}>
                — {relatedOrder.client.full_name}
              </Typography>
            )}
            {relatedOrder && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {new Date(relatedOrder.created_at).toLocaleDateString("es-BO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 0.5 }}>
            <StatusBadge label={status.label} color={status.color} />
            <Typography variant="caption" color="text.secondary">
              {deliveryType.icon} {deliveryType.label}
            </Typography>
            {pendingOrders.length > 1 && (
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
                ⚠️ {pendingOrders.length} pedidos pendientes
              </span>
            )}
            {pendingOrders.length === 1 && (
              <span
                style={{
                  background: APP_PALETTE.surfaces.successSoft,
                  color: APP_PALETTE.status.success,
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ✓ Único pendiente
              </span>
            )}
          </Box>

          {item.address && (
            <Typography variant="caption" color="text.secondary" display="block">
              📍 {item.address}
            </Typography>
          )}
          {item.tracking_notes && (
            <Typography variant="caption" color="text.secondary" display="block">
              📝 {item.tracking_notes}
            </Typography>
          )}
        </Box>

        <Box>
          {!isEditing ? (
            <Button
              size="small"
              variant="outlined"
              onClick={onStartEdit}
              sx={{
                color: APP_PALETTE.brand.primary,
                borderColor: APP_PALETTE.surfaces.brandBorderSoft,
                background: APP_PALETTE.brand.soft,
                borderRadius: 2,
                fontSize: 13,
              }}
            >
              Actualizar
            </Button>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 280 }}>
              <TextField
                select
                size="small"
                fullWidth
                value={editValue.delivery_status}
                onChange={(e) => onEditField("delivery_status", e.target.value)}
              >
                <MenuItem value="in_store">En tienda</MenuItem>
                <MenuItem value="sent">Enviado</MenuItem>
                <MenuItem value="delivered">Entregado</MenuItem>
                <MenuItem value="failed">Fallido</MenuItem>
              </TextField>
              <TextField
                size="small"
                fullWidth
                placeholder="Notas de seguimiento"
                value={editValue.tracking_notes}
                onChange={(e) => onEditField("tracking_notes", e.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                placeholder="Dirección / Punto de encuentro"
                value={editValue.address}
                onChange={(e) => onEditField("address", e.target.value)}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  onClick={onSave}
                  sx={{ background: APP_PALETTE.status.success, "&:hover": { background: APP_PALETTE.brand.primary }, borderRadius: 2, fontSize: 13 }}
                >
                  Guardar
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={onCancelEdit}
                  sx={{ color: APP_PALETTE.text.secondary, borderColor: APP_PALETTE.surfaces.border, borderRadius: 2, fontSize: 13 }}
                >
                  Cancelar
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
