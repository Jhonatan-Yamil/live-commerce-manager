import { useState, useEffect } from "react";
import {
  Box, Button, TextField, MenuItem, Typography, Paper,
} from "@mui/material";
import { paymentsApi } from "../services/api";
import SearchBar from "../components/common/SearchBar";
import TablePager from "../components/common/TablePager";
import { PAYMENT_STATUS_CONFIG } from "../utils/constants";

const STATUS_LABELS_NEXT = {
  in_review: "Marcar en revisión",
  confirmed: "Confirmar pago ✓",
  rejected: "Rechazar pago ✗",
};

const NEXT_COLORS = {
  confirmed: "#10b981",
  rejected: "#ef4444",
  in_review: "#3b82f6",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState({});
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = () => paymentsApi.list().then((r) => setPayments(r.data));
  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    await paymentsApi.updateStatus(id, { status, notes: notes[id] || null });
    load();
  };

  const uploadVoucher = async (orderId) => {
    const file = files[orderId];
    if (!file) return alert("Selecciona un archivo primero");
    setUploading({ ...uploading, [orderId]: true });
    try {
      await paymentsApi.uploadVoucher(orderId, file);
      setFiles({ ...files, [orderId]: null });
      load();
    } catch {
      alert("Error al subir el comprobante");
    } finally {
      setUploading({ ...uploading, [orderId]: false });
    }
  };

  const filtered = payments.filter((p) => {
    const matchSearch = !search || String(p.order_id).includes(search) || (p.client_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    {
      key: "paymentStatus",
      type: "select",
      label: "Estado",
      value: statusFilter,
      defaultValue: "all",
      onChange: (value) => {
        setStatusFilter(value);
        setPage(0);
      },
      options: [
        { value: "all", label: "Todos los estados" },
        { value: "pending", label: "Pendiente" },
        { value: "in_review", label: "En revision" },
        { value: "confirmed", label: "Confirmado" },
        { value: "rejected", label: "Rechazado" },
      ],
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color="#1a1a2e" mb={3}>Gestión de Pagos</Typography>

      <SearchBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        filters={statusFilters}
        resultCount={filtered.length}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
          setPage(0);
        }}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => {
          const s = PAYMENT_STATUS_CONFIG[p.status];
          return (
            <Paper key={p.id} sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.color}` }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography fontWeight={700} fontSize={15} color="#1a1a2e">
                      {p.client_name || "Cliente desconocido"}
                    </Typography>
                    <span style={{ background: s.color + "20", color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Pedido #{p.order_id}
                    {p.order_total && <span style={{ marginLeft: 8, fontWeight: 600, color: "#4f46e5" }}>Bs. {p.order_total.toFixed(2)}</span>}
                    {p.order_created_at && <span style={{ marginLeft: 8 }}>{new Date(p.order_created_at).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </Typography>
                  {p.voucher_path && (
                    <Box mt={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Comprobante:{" "}
                        <a href={`http://localhost:8000/uploads/${p.voucher_path}`} target="_blank" rel="noreferrer"
                          style={{ color: "#4f46e5", fontWeight: 600 }}>Ver comprobante</a>
                      </Typography>
                    </Box>
                  )}
                  {p.notes && <Typography variant="caption" color="text.secondary" display="block">Nota: {p.notes}</Typography>}
                  {p.reviewed_at && <Typography variant="caption" color="text.secondary" display="block">Revisado: {new Date(p.reviewed_at).toLocaleString("es-BO")}</Typography>}
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 280 }}>
                  {p.status === "pending" && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, background: "#f8f9fc" }}>
                      <Typography variant="caption" fontWeight={500} color="#555" display="block" mb={1}>
                        Subir comprobante (imagen o PDF)
                      </Typography>
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setFiles({ ...files, [p.order_id]: e.target.files[0] })}
                        style={{ width: "100%", marginBottom: 8, fontSize: 13 }} />
                      {files[p.order_id] && (
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                          📎 {files[p.order_id].name}
                        </Typography>
                      )}
                      <Button fullWidth variant="contained" size="small"
                        disabled={!files[p.order_id] || uploading[p.order_id]}
                        onClick={() => uploadVoucher(p.order_id)}
                        sx={{ background: files[p.order_id] ? "#4f46e5" : "#e0e0e0", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
                        {uploading[p.order_id] ? "Subiendo..." : "Registrar comprobante"}
                      </Button>
                    </Paper>
                  )}
                  {s.next.length > 0 && (
                    <Box>
                      <TextField size="small" fullWidth placeholder="Notas (opcional)" value={notes[p.id] || ""}
                        onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} sx={{ mb: 1 }} />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {s.next.map((ns) => (
                          <Button key={ns} fullWidth size="small" variant="contained"
                            onClick={() => changeStatus(p.id, ns)}
                            sx={{ background: NEXT_COLORS[ns], "&:hover": { filter: "brightness(0.9)" }, borderRadius: 2, fontSize: 12 }}>
                            {STATUS_LABELS_NEXT[ns]}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })}
        {filtered.length === 0 && (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <Typography color="text.secondary">{search || statusFilter !== "all" ? "No se encontraron pagos" : "No hay pagos registrados"}</Typography>
          </Paper>
        )}
      </Box>

      {filtered.length > rowsPerPage && (
        <TablePager
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
        />
      )}
    </Box>
  );
}