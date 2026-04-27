import { useState, useEffect } from "react";
import {
  Box, Button, Typography, Paper, Grid, TablePagination, TextField,
} from "@mui/material";
import SearchBar from "../components/common/SearchBar";
import { lotsApi } from "../services/api";
import useCrudForm from "../hooks/useCrudForm";
import { APP_PALETTE } from "../theme/palette";

export default function LotsPage() {
  const [lots, setLots] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const load = () => lotsApi.list().then((r) => setLots(r.data));
  useEffect(() => { load(); }, []);

  const {
    showForm,
    editing,
    form,
    setForm,
    toggleCreate,
    openEdit,
    submitForm,
  } = useCrudForm({
    initialForm: { name: "", brand: "", total_units: "", total_cost: "", notes: "" },
    loadData: load,
    createItem: (payload) => lotsApi.create(payload),
    updateItem: (id, payload) => lotsApi.update(id, payload),
    mapToForm: (l) => ({
      name: l.name,
      brand: l.brand,
      total_units: String(l.total_units),
      total_cost: String(l.total_cost),
      notes: l.notes || "",
    }),
    mapToPayload: (payload) => ({
      ...payload,
      total_units: parseInt(payload.total_units, 10),
      total_cost: parseFloat(payload.total_cost),
    }),
  });

  useEffect(() => {
    if (!showForm) {
      setSubmitAttempted(false);
    }
  }, [showForm]);

  const filtered = lots.filter((l) =>
    !search ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.brand.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.id - a.id);

  const unitCostPreview = form.total_units && form.total_cost
    ? `Bs. ${(parseFloat(form.total_cost) / parseInt(form.total_units)).toFixed(2)} por unidad`
    : "—";

  const handleSubmit = () => {
    setSubmitAttempted(true);
    submitForm();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color={APP_PALETTE.text.primary}>Lotes de mercancía</Typography>
        <Button variant="contained"
          onClick={toggleCreate}
          sx={{ background: APP_PALETTE.brand.primary, "&:hover": { background: APP_PALETTE.brand.primaryHover }, borderRadius: 2 }}>
          {showForm ? "Cancelar" : "+ Nuevo lote"}
        </Button>
      </Box>

      {showForm && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <Typography variant="h6" fontWeight={600} mb={2}>{editing ? "Editar lote" : "Registrar lote"}</Typography>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={8}>
              <TextField label={submitAttempted ? "Nombre del lote *" : "Nombre del lote"} size="small" fullWidth
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Zara Enero 2026" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label={submitAttempted ? "Marca *" : "Marca"} size="small" fullWidth
                value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Ej: Zara" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label={submitAttempted ? "Unidades totales *" : "Unidades totales"} type="number" size="small" fullWidth inputProps={{ min: 1 }}
                value={form.total_units} onChange={(e) => setForm({ ...form, total_units: e.target.value })} placeholder="100" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label={submitAttempted ? "Costo total (Bs.) *" : "Costo total (Bs.)"} type="number" size="small" fullWidth inputProps={{ step: 0.01 }}
                value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} placeholder="20000" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 1.5, background: APP_PALETTE.brand.soft, borderRadius: 2, height: "100%", display: "flex", alignItems: "center" }}>
                <Typography fontSize={14} fontWeight={600} color={APP_PALETTE.brand.primary}>
                  Costo unitario estimado: {unitCostPreview}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notas" size="small" fullWidth multiline rows={2}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones del lote..." />
            </Grid>
          </Grid>
          <Button variant="contained" onClick={handleSubmit}
            disabled={!form.name || !form.brand || !form.total_units || !form.total_cost}
            sx={{ background: APP_PALETTE.brand.primary, "&:hover": { background: APP_PALETTE.brand.primaryHover }, borderRadius: 2 }}>
            {editing ? "Guardar cambios" : "Registrar lote"}
          </Button>
        </Paper>
      )}

      <SearchBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        resultCount={filtered.length}
        onClear={() => {
          setSearch("");
          setPage(0);
        }}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((l) => {
          const profitColor = l.profit >= 0 ? APP_PALETTE.status.success : APP_PALETTE.status.error;
          const pctSold = l.total_units > 0 ? Math.min(100, Math.round((l.units_sold / l.total_units) * 100)) : 0;
          return (
            <Paper key={l.id} sx={{ p: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                  <Typography fontWeight={700} fontSize={16} color={APP_PALETTE.text.primary}>{l.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Marca: <strong>{l.brand}</strong></Typography>
                  {l.notes && <Typography variant="caption" color="text.secondary" display="block">{l.notes}</Typography>}
                </Box>
                <Button variant="outlined" size="small" onClick={() => openEdit(l)}
                  sx={{ color: APP_PALETTE.brand.primary, borderColor: APP_PALETTE.surfaces.brandBorderSoft, background: APP_PALETTE.brand.soft, borderRadius: 2, fontSize: 13 }}>
                  Editar
                </Button>
              </Box>

              <Grid container spacing={1.5} mb={2}>
                {[
                  { label: "Unidades totales", value: `${l.total_units} uds` },
                  { label: "Unidades vendidas", value: `${l.units_sold} uds`, color: APP_PALETTE.brand.primary },
                  { label: "Unidades restantes", value: `${l.units_remaining} uds`, color: l.units_remaining === 0 ? APP_PALETTE.status.error : APP_PALETTE.status.warning },
                  { label: "Costo unitario", value: `Bs. ${Number(l.unit_cost).toFixed(2)}`, color: APP_PALETTE.text.muted },
                  { label: "Ingresos", value: `Bs. ${Number(l.total_revenue).toFixed(2)}`, color: APP_PALETTE.status.success },
                  { label: "Ganancia estimada", value: `Bs. ${Number(l.profit).toFixed(2)}`, color: profitColor },
                ].map((stat) => (
                  <Grid item xs={6} sm={4} md={2} key={stat.label}>
                    <Box sx={{ background: APP_PALETTE.surfaces.subtle, borderRadius: 2, p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" display="block">{stat.label}</Typography>
                      <Typography fontWeight={700} fontSize={15} color={stat.color || APP_PALETTE.text.primary}>{stat.value}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Progreso de ventas</Typography>
                  <Typography variant="caption" fontWeight={600} color={APP_PALETTE.brand.primary}>{pctSold}%</Typography>
                </Box>
                <Box sx={{ background: APP_PALETTE.surfaces.borderSoft, borderRadius: 10, height: 8 }}>
                  <Box sx={{ width: `${pctSold}%`, background: APP_PALETTE.brand.primary, borderRadius: 10, height: 8, transition: "width 0.3s" }} />
                </Box>
              </Box>
            </Paper>
          );
        })}
        {filtered.length === 0 && (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <Typography color="text.secondary">{search ? "No se encontraron lotes" : "No hay lotes registrados"}</Typography>
          </Paper>
        )}
      </Box>

      {filtered.length > rowsPerPage && (
        <TablePagination component="div" count={filtered.length} page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Box>
  );
}