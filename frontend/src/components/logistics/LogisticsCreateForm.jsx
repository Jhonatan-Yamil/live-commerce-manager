import { useState } from "react";
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { APP_PALETTE } from "../../theme/palette";

export default function LogisticsCreateForm({
  form,
  setForm,
  orderSearch,
  setOrderSearch,
  filteredAvailableOrders,
  onToggleOrder,
  onCreate,
}) {
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleCreate = () => {
    setSubmitAttempted(true);
    onCreate();
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
      <Typography variant="h6" fontWeight={600} mb={2}>
        Crear registro de entrega
      </Typography>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12}>
          <Typography variant="caption" fontWeight={500} color={APP_PALETTE.text.secondary} display="block" mb={1}>
            Seleccionar pedidos a entregar (pago confirmado){submitAttempted ? " *" : ""} — puedes seleccionar varios
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar por nombre de cliente o # de pedido..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Box sx={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}>
              {filteredAvailableOrders.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                  {orderSearch ? "No se encontraron pedidos" : "No hay pedidos con pago confirmado pendientes de entrega"}
                </Typography>
              ) : (
                filteredAvailableOrders.map((o) => {
                  const isSelected = form.selected_orders?.includes(o.id);
                  return (
                    <Box
                      key={o.id}
                      component="label"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        background: isSelected ? APP_PALETTE.brand.soft : APP_PALETTE.surface,
                        border: `1px solid ${isSelected ? APP_PALETTE.brand.primary : APP_PALETTE.surfaces.borderSoft}`,
                        "&:hover": { background: isSelected ? APP_PALETTE.brand.soft : APP_PALETTE.surfaces.subtle },
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleOrder(o.id)}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={600} display="inline" fontSize={14}>
                          #{o.id}
                        </Typography>
                        <Typography display="inline" fontSize={14} sx={{ ml: 1 }}>
                          {o.client?.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {new Date(o.created_at).toLocaleDateString("es-BO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                        <Typography variant="caption" fontWeight={600} color={APP_PALETTE.brand.primary} sx={{ ml: 1 }}>
                          Bs. {Number(o.total).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>
          {form.selected_orders?.length > 0 && (
            <Typography variant="caption" fontWeight={600} color={APP_PALETTE.brand.primary} sx={{ mt: 0.5, display: "block" }}>
              {form.selected_orders.length} pedido(s) seleccionado(s)
            </Typography>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            select
            size="small"
            fullWidth
            label="Tipo de entrega"
            value={form.delivery_type}
            onChange={(e) => setForm((prev) => ({ ...prev, delivery_type: e.target.value }))}
          >
            <MenuItem value="pickup">🏪 Retiro en tienda</MenuItem>
            <MenuItem value="shipping">🚚 Envío a otra ciudad</MenuItem>
            <MenuItem value="coordinated">📍 Entrega coordinada</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            size="small"
            fullWidth
            label="Dirección / Punto de encuentro"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder={
              form.delivery_type === "pickup"
                ? "Dirección de la tienda"
                : form.delivery_type === "shipping"
                  ? "Ciudad de destino"
                  : "Punto de encuentro"
            }
          />
        </Grid>
      </Grid>
      <Button
        variant="contained"
        onClick={handleCreate}
        disabled={!form.selected_orders?.length}
        sx={{ background: APP_PALETTE.brand.primary, "&:hover": { background: APP_PALETTE.brand.primaryHover }, borderRadius: 2 }}
      >
        Crear registro
      </Button>
    </Paper>
  );
}
