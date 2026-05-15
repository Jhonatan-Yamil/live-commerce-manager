import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box, Button, Paper, MenuItem, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { APP_PALETTE } from "../theme/palette";
import { cashFlowApi } from "../services/api";
import { formatCurrencyBs, formatDateEsBo } from "../utils/formatters";

const CashFlowPage = () => {
  const [cashFlowData, setCashFlowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadCashFlow = useCallback(async () => {
    setLoading(true);
    try {
      const response = await cashFlowApi.getReport(dateFrom, dateTo);
      setCashFlowData(response.data);
    } catch (error) {
      console.error("Error loading cash flow:", error);
      setCashFlowData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadCashFlow();
  }, []);

  const summary = useMemo(() => {
    if (!cashFlowData) return { income: 0, expenses: 0, net: 0 };
    return {
      income: cashFlowData.total_income || 0,
      expenses: cashFlowData.total_expenses || 0,
      net: cashFlowData.net || 0,
    };
  }, [cashFlowData]);

  const transactions = useMemo(() => {
    const all = cashFlowData?.details || [];
    const term = search.trim().toLowerCase();
    return all.filter((tx) => {
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      const matchesSearch = !term || tx.description.toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [cashFlowData, typeFilter, search]);

  const summaryCards = [
    {
      label: "Ingresos",
      value: formatCurrencyBs(summary.income),
      color: APP_PALETTE.status.success,
      bg: APP_PALETTE.surfaces.successSoft,
      border: APP_PALETTE.status.success,
    },
    {
      label: "Egresos",
      value: formatCurrencyBs(summary.expenses),
      color: APP_PALETTE.status.error,
      bg: APP_PALETTE.surfaces.errorSoft,
      border: APP_PALETTE.status.error,
    },
    {
      label: "Neto",
      value: formatCurrencyBs(summary.net),
      color: summary.net >= 0 ? APP_PALETTE.status.success : APP_PALETTE.status.error,
      bg: summary.net >= 0 ? APP_PALETTE.surfaces.successSoft : APP_PALETTE.surfaces.errorSoft,
      border: summary.net >= 0 ? APP_PALETTE.status.success : APP_PALETTE.status.error,
    },
    {
      label: "Período",
      value: `${formatDateEsBo(dateFrom + "T00:00:00")} — ${formatDateEsBo(dateTo + "T00:00:00")}`,
      color: APP_PALETTE.brand.primary,
      bg: APP_PALETTE.surfaces.infoSoft,
      border: APP_PALETTE.brand.primary,
      small: true,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color={APP_PALETTE.text.primary}>
          Flujo de Caja
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
        {summaryCards.map((card) => (
          <Paper
            key={card.label}
            sx={{
              p: 2,
              backgroundColor: card.bg,
              border: `1px solid ${card.border}22`,
              borderRadius: 3,
              boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Typography variant="caption" color={APP_PALETTE.text.muted} fontWeight={600} display="block" mb={0.5}>
              {card.label}
            </Typography>
            <Typography
              variant={card.small ? "body2" : "h6"}
              fontWeight={700}
              sx={{ color: card.color }}
            >
              {card.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <Typography variant="h6" fontWeight={700} color={APP_PALETTE.text.primary} mb={0.5}>
          Transacciones
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Detalle de ingresos y egresos en el período seleccionado
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            sx={{ minWidth: 260 }}
            placeholder="Buscar por descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <TextField
            select
            size="small"
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="income">Ingresos</MenuItem>
            <MenuItem value="expense">Egresos</MenuItem>
          </TextField>
          <TextField
            label="Desde"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Hasta"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button
            variant="contained"
            onClick={loadCashFlow}
            disabled={loading}
            sx={{
              backgroundColor: APP_PALETTE.brand.primary,
              "&:hover": { backgroundColor: APP_PALETTE.brand.primaryHover },
            }}
          >
            {loading ? "Cargando..." : "Filtrar"}
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: APP_PALETTE.text.secondary }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700, color: APP_PALETTE.text.secondary }}>Descripción</TableCell>
              <TableCell sx={{ fontWeight: 700, color: APP_PALETTE.text.secondary }} align="right">Ingreso</TableCell>
              <TableCell sx={{ fontWeight: 700, color: APP_PALETTE.text.secondary }} align="right">Egreso</TableCell>
              <TableCell sx={{ fontWeight: 700, color: APP_PALETTE.text.secondary }} align="right">Saldo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((tx, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ color: APP_PALETTE.text.secondary, whiteSpace: "nowrap" }}>
                    {formatDateEsBo(tx.date + "T00:00:00")}
                  </TableCell>
                  <TableCell sx={{ color: APP_PALETTE.text.primary }}>
                    {tx.description}
                  </TableCell>
                  <TableCell align="right" sx={{ color: APP_PALETTE.status.success, fontWeight: 600 }}>
                    {tx.type === "income" ? formatCurrencyBs(tx.amount) : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ color: APP_PALETTE.status.error, fontWeight: 600 }}>
                    {tx.type === "expense" ? formatCurrencyBs(tx.amount) : "—"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: tx.balance >= 0 ? APP_PALETTE.status.success : APP_PALETTE.status.error,
                      fontWeight: 700,
                    }}
                  >
                    {formatCurrencyBs(tx.balance)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="caption" color="text.secondary">
                    {loading ? "Cargando transacciones..." : "No hay transacciones en este período"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default CashFlowPage;