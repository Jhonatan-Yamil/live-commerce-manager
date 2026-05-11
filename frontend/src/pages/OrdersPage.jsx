import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ordersApi } from "../services/api";
import SearchBar from "../components/common/SearchBar";
import StatusBadge from "../components/common/StatusBadge";
import TablePager from "../components/common/TablePager";
import OrderCompletionDialog from "../components/orders/OrderCompletionDialog";
import { ORDER_STATUS_LABELS } from "../utils/constants";
import { APP_PALETTE } from "../theme/palette";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = () => ordersApi.list().then((r) => setOrders(r.data));

  useEffect(() => {
    load();
  }, []);

  const filtered = orders
    .filter((o) => {
      const matchSearch =
        !search ||
        String(o.id).includes(search) ||
        (o.client?.full_name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      const orderDate = new Date(o.created_at);
      const matchFrom = !dateFrom || orderDate >= new Date(dateFrom);
      const matchTo = !dateTo || orderDate <= new Date(`${dateTo}T23:59:59`);
      return matchSearch && matchStatus && matchFrom && matchTo;
    })
    .sort((a, b) => b.id - a.id);

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const searchFilters = [
    {
      key: "status",
      type: "select",
      label: "Estado",
      value: statusFilter,
      defaultValue: "all",
      onChange: (value) => {
        setStatusFilter(value);
        setPage(0);
      },
      options: [{ value: "all", label: "Todos los estados" }, ...statusOptions],
    },
    {
      key: "from",
      type: "date",
      label: "Desde",
      value: dateFrom,
      defaultValue: "",
      onChange: (value) => {
        setDateFrom(value);
        setPage(0);
      },
    },
    {
      key: "to",
      type: "date",
      label: "Hasta",
      value: dateTo,
      defaultValue: "",
      onChange: (value) => {
        setDateTo(value);
        setPage(0);
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color={APP_PALETTE.text.primary}>
          Pedidos
        </Typography>
        <Button
          variant="contained"
          onClick={() => setShowForm(true)}
          sx={{ background: APP_PALETTE.brand.primary, "&:hover": { background: APP_PALETTE.brand.primaryHover }, borderRadius: 2 }}
        >
          + Nuevo pedido
        </Button>
      </Box>

      <SearchBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        filters={searchFilters}
        resultCount={filtered.length}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
          setDateFrom("");
          setDateTo("");
          setPage(0);
        }}
      />

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: APP_PALETTE.surfaces.subtle }}>
              {["#", "Cliente", "Ítems", "Total", "Estado", "Fecha"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: APP_PALETTE.text.muted, fontSize: 13 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((o) => {
              const s = ORDER_STATUS_LABELS[o.status] || { label: o.status, color: APP_PALETTE.text.muted };
              return (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: APP_PALETTE.text.secondary }}>#{o.id}</TableCell>
                  <TableCell>{o.client?.full_name}</TableCell>
                  <TableCell sx={{ color: APP_PALETTE.text.secondary, fontSize: 13 }}>{o.items?.length || 0} ítem(s)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bs. {Number(o.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <StatusBadge label={s.label} color={s.color} />
                  </TableCell>
                  <TableCell sx={{ color: APP_PALETTE.text.muted, fontSize: 13 }}>
                    {new Date(o.created_at).toLocaleDateString("es-BO")}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: APP_PALETTE.text.muted }}>
                  {search || statusFilter !== "all" || dateFrom || dateTo
                    ? "No se encontraron pedidos"
                    : "No hay pedidos registrados"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePager
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(0);
          }}
        />
      </TableContainer>

      <OrderCompletionDialog
        open={showForm}
        suggestion={null}
        onClose={() => setShowForm(false)}
        onCompleted={load}
      />
    </Box>
  );
}
