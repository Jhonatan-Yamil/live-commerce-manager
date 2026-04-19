import { useMemo, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import SearchBar from "../components/common/SearchBar";
import TablePager from "../components/common/TablePager";
import { PAYMENT_STATUS_CONFIG } from "../utils/constants";
import OrderCompletionDialog from "../components/orders/OrderCompletionDialog";
import usePaymentsData from "../hooks/usePaymentsData";
import PaymentSuggestionPanel from "../components/payments/PaymentSuggestionPanel";
import PaymentRecordCard from "../components/payments/PaymentRecordCard";

export default function PaymentsPage() {
  const {
    payments,
    suggestions,
    orders,
    notes,
    setNotes,
    files,
    setFiles,
    uploading,
    reassignOrder,
    setReassignOrder,
    processingAction,
    showReassign,
    setShowReassign,
    completionSuggestion,
    setCompletionSuggestion,
    isRefreshing,
    lastUpdatedAt,
    load,
    changeStatus,
    uploadVoucher,
    handleSuggestionAction,
  } = usePaymentsData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const filtered = useMemo(() => {
    return payments
      .filter((p) => {
        const matchSearch = !search || String(p.order_id).includes(search) || (p.client_name || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || p.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.id - a.id);
  }, [payments, search, statusFilter]);

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
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1a1a2e">Gestión de Pagos</Typography>
          {lastUpdatedAt && (
            <Typography variant="caption" color="text.secondary">
              Actualizado: {lastUpdatedAt.toLocaleTimeString("es-BO")}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          disabled={isRefreshing}
          onClick={() => load(true)}
        >
          {isRefreshing ? "Actualizando..." : "Actualizar ahora"}
        </Button>
      </Box>

      <PaymentSuggestionPanel
        suggestions={suggestions}
        orders={orders}
        processingAction={processingAction}
        showReassign={showReassign}
        setShowReassign={setShowReassign}
        reassignOrder={reassignOrder}
        setReassignOrder={setReassignOrder}
        onSuggestionAction={handleSuggestionAction}
        onOpenOrderCompletion={setCompletionSuggestion}
      />

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
            <PaymentRecordCard
              key={p.id}
              payment={p}
              statusConfig={s}
              noteValue={notes[p.id] || ""}
              onNoteChange={(value) => setNotes((prev) => ({ ...prev, [p.id]: value }))}
              selectedFile={files[p.order_id]}
              onFileChange={(file) => setFiles((prev) => ({ ...prev, [p.order_id]: file }))}
              isUploading={uploading[p.order_id]}
              onUploadVoucher={() => uploadVoucher(p.order_id)}
              onChangeStatus={(nextStatus) => changeStatus(p.id, nextStatus)}
            />
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

      <OrderCompletionDialog
        open={Boolean(completionSuggestion)}
        suggestion={completionSuggestion}
        onClose={() => setCompletionSuggestion(null)}
        onCompleted={load}
      />
    </Box>
  );
}