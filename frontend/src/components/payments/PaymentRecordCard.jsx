import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { getBackendOrigin } from "../../services/api";
import { NEXT_COLORS, STATUS_LABELS_NEXT } from "./constants";

const buildVoucherUrl = (voucherPath) => {
  if (!voucherPath) return null;
  if (/^https?:\/\//i.test(voucherPath)) return voucherPath;
  const cleanedPath = String(voucherPath).trim();
  const normalizedPath = cleanedPath.startsWith("/uploads/")
    ? cleanedPath
    : `/uploads/${cleanedPath.replace(/^\/+/, "")}`;
  return `${getBackendOrigin()}${normalizedPath}`;
};

export default function PaymentRecordCard({
  payment,
  statusConfig,
  noteValue,
  onNoteChange,
  selectedFile,
  onFileChange,
  isUploading,
  onUploadVoucher,
  onChangeStatus,
}) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${statusConfig.color}` }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography fontWeight={700} fontSize={15} color="#1a1a2e">
              {payment.client_name || "Cliente desconocido"}
            </Typography>
            <span style={{ background: `${statusConfig.color}20`, color: statusConfig.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
              {statusConfig.label}
            </span>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Pedido #{payment.order_id}
            {payment.order_total && <span style={{ marginLeft: 8, fontWeight: 600, color: "#4f46e5" }}>Bs. {payment.order_total.toFixed(2)}</span>}
            {payment.order_created_at && <span style={{ marginLeft: 8 }}>{new Date(payment.order_created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}</span>}
          </Typography>
          {payment.voucher_path && (
            <Box mt={0.5}>
              <Typography variant="caption" color="text.secondary">
                Comprobante:{" "}
                <a href={buildVoucherUrl(payment.voucher_path)} target="_blank" rel="noreferrer" style={{ color: "#4f46e5", fontWeight: 600 }}>
                  Ver comprobante
                </a>
              </Typography>
            </Box>
          )}
          {payment.notes && <Typography variant="caption" color="text.secondary" display="block">Nota: {payment.notes}</Typography>}
          {payment.reviewed_at && <Typography variant="caption" color="text.secondary" display="block">Revisado: {new Date(payment.reviewed_at).toLocaleString("es-BO")}</Typography>}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 280 }}>
          {payment.status === "pending" && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, background: "#f8f9fc" }}>
              <Typography variant="caption" fontWeight={500} color="#555" display="block" mb={1}>
                Subir comprobante (imagen o PDF)
              </Typography>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => onFileChange(e.target.files[0])}
                style={{ width: "100%", marginBottom: 8, fontSize: 13 }}
              />
              {selectedFile && (
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  📎 {selectedFile.name}
                </Typography>
              )}
              <Button
                fullWidth
                variant="contained"
                size="small"
                disabled={!selectedFile || isUploading}
                onClick={onUploadVoucher}
                sx={{ background: selectedFile ? "#4f46e5" : "#e0e0e0", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}
              >
                {isUploading ? "Subiendo..." : "Registrar comprobante"}
              </Button>
            </Paper>
          )}

          {statusConfig.next.length > 0 && (
            <Box>
              <TextField
                size="small"
                fullWidth
                placeholder="Notas (opcional)"
                value={noteValue}
                onChange={(e) => onNoteChange(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                {statusConfig.next.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    fullWidth
                    size="small"
                    variant="contained"
                    onClick={() => onChangeStatus(nextStatus)}
                    sx={{ background: NEXT_COLORS[nextStatus], "&:hover": { filter: "brightness(0.9)" }, borderRadius: 2, fontSize: 12 }}
                  >
                    {STATUS_LABELS_NEXT[nextStatus]}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
