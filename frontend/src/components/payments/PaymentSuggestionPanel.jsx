import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { APP_PALETTE } from "../../theme/palette";

export default function PaymentSuggestionPanel({
  suggestions,
  orders,
  processingAction,
  showReassign,
  setShowReassign,
  reassignOrder,
  setReassignOrder,
  onSuggestionAction,
  onOpenOrderCompletion,
}) {
  const [advancedMenu, setAdvancedMenu] = useState({ anchorEl: null, suggestionId: null });

  const openAdvancedMenu = (event, suggestionId) => {
    setAdvancedMenu({ anchorEl: event.currentTarget, suggestionId });
  };

  const closeAdvancedMenu = () => {
    setAdvancedMenu({ anchorEl: null, suggestionId: null });
  };

  return (
    <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
      <Typography variant="h6" fontWeight={700} color={APP_PALETTE.text.primary} mb={1.5}>
        Pagos por revisar
      </Typography>
      {suggestions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No hay sugerencias pendientes por revisar</Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {suggestions.slice(0, 8).map((s) => {
            const reassignCandidates = orders.filter((o) => {
              if (!s.matched_client_name) return true;
              return (o.client?.full_name || "").toLowerCase().includes(s.matched_client_name.toLowerCase());
            });
            const amountLabel = s.extracted_amount != null
              ? `Monto: Bs. ${Number(s.extracted_amount).toFixed(2)}`
              : "Monto: no detectado";

            return (
              <Paper key={s.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Comprobante #{s.id} • {s.matched_client_name ? `Cliente: ${s.matched_client_name}` : "Cliente nuevo o no registrado"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      Pedido sugerido: #{s.matched_order_id || "-"} • Referencia: {s.extracted_reference || "No disponible"}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => openAdvancedMenu(e, s.id)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1, mb: 1 }}>
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={amountLabel}
                    sx={{ fontWeight: 600 }}
                  />
                  {!s.matched_client_name && (
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label={`Nombre: ${s.extracted_sender_name || "No detectado"}`}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Stack>

                {s.processing_status === "failed" && (
                  <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                    No se pudo leer este comprobante completamente. Puedes intentar nuevamente desde opciones.
                  </Typography>
                )}

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  {s.needs_order_completion ? (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={processingAction[s.id]}
                      onClick={() => onOpenOrderCompletion(s)}
                      sx={{
                        backgroundColor: APP_PALETTE.surfaces.warningSoft,
                        color: APP_PALETTE.status.warning,
                        border: `1px solid ${APP_PALETTE.status.warning}33`,
                        boxShadow: "none",
                        fontWeight: 700,
                        "&:hover": {
                          backgroundColor: "#e7dfae",
                          boxShadow: "none",
                        },
                      }}
                    >
                      Aceptar y completar
                    </Button>
                  ) : (
                    <Button size="small" variant="contained" color="success" disabled={processingAction[s.id]} onClick={() => onSuggestionAction(s.id, "confirm")}>
                      Aceptar pago
                    </Button>
                  )}
                  <Button size="small" variant="contained" color="error" disabled={processingAction[s.id]} onClick={() => onSuggestionAction(s.id, "reject")}>
                    Rechazar
                  </Button>
                </Box>

                {showReassign[s.id] && (
                  <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <Autocomplete
                      options={reassignCandidates}
                      getOptionLabel={(o) => `${o.client?.full_name || "Cliente"} • Pedido #${o.id} • Bs. ${Number(o.total || 0).toFixed(2)}`}
                      value={reassignOrder[s.id] || null}
                      onChange={(_, value) => setReassignOrder((prev) => ({ ...prev, [s.id]: value }))}
                      renderInput={(params) => (
                        <TextField {...params} size="small" placeholder="Selecciona el pedido correcto" />
                      )}
                      sx={{ width: 360 }}
                    />
                    <Button size="small" variant="outlined" disabled={processingAction[s.id]} onClick={() => onSuggestionAction(s.id, "reassign")}>
                      Guardar pedido correcto
                    </Button>
                  </Box>
                )}

                <Menu
                  anchorEl={advancedMenu.anchorEl}
                  open={advancedMenu.suggestionId === s.id}
                  onClose={closeAdvancedMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem
                    onClick={async () => {
                      closeAdvancedMenu();
                      await onSuggestionAction(s.id, "reprocess");
                    }}
                    disabled={processingAction[s.id]}
                  >
                    Volver a analizar comprobante
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      closeAdvancedMenu();
                      setShowReassign((prev) => ({ ...prev, [s.id]: !prev[s.id] }));
                    }}
                  >
                    {showReassign[s.id] ? "Ocultar cambio de pedido" : "Cambiar pedido sugerido"}
                  </MenuItem>
                  <Divider />
                  <MenuItem disabled>Opciones avanzadas</MenuItem>
                </Menu>
              </Paper>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
