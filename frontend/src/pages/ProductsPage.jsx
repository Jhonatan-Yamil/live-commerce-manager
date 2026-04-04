import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Grid,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Button, CircularProgress,
} from "@mui/material";
import { productsApi } from "../services/api";
import SearchBar from "../components/common/SearchBar";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    productsApi.sold().then((r) => {
      setProducts(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.product_id - a.product_id);

  const totalRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0);
  const totalUnits = products.reduce((sum, p) => sum + p.units_sold, 0);
  const toggleExpand = (id) => setExpanded({ ...expanded, [id]: !expanded[id] });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color="#1a1a2e" mb={0.5}>
        Historial de productos vendidos
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={3}>
        Resumen de todos los productos registrados en pedidos
      </Typography>

      <Grid container spacing={2} mb={3}>
        {[
          { label: "Productos distintos", value: products.length, icon: "🏷️", color: "#4f46e5" },
          { label: "Unidades vendidas", value: totalUnits, icon: "📦", color: "#0891b2" },
          { label: "Ingresos totales", value: `Bs. ${totalRevenue.toFixed(2)}`, icon: "💰", color: "#059669" },
        ].map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${s.color}` }}>
              <Typography fontSize={24} mb={1}>{s.icon}</Typography>
              <Typography fontSize={22} fontWeight={700} color={s.color}>{s.value}</Typography>
              <Typography color="text.secondary" fontSize={12} mt={0.5}>{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

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

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#f8f9fc" }}>
              {["Producto", "Unidades vendidas", "Pedidos", "Precio promedio", "Ingresos generados", "Lotes"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "#888", fontSize: 13 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} sx={{ color: "#4f46e5" }} />
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                <>
                  <TableRow key={p.product_id} hover sx={{ borderBottom: expanded[p.product_id] ? "none" : undefined }}>
                    <TableCell sx={{ fontWeight: 600, color: "#1a1a2e" }}>{p.name}</TableCell>
                    <TableCell sx={{ color: "#4f46e5", fontWeight: 600 }}>{p.units_sold} uds</TableCell>
                    <TableCell sx={{ color: "#666" }}>{p.orders_count} pedido(s)</TableCell>
                    <TableCell sx={{ color: "#666" }}>Bs. {p.avg_price.toFixed(2)}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#059669" }}>Bs. {p.total_revenue.toFixed(2)}</TableCell>
                    <TableCell>
                      {p.lots.length > 0 ? (
                        <Button size="small" variant="outlined" onClick={() => toggleExpand(p.product_id)}
                          sx={{ color: "#4f46e5", borderColor: "#c7d2fe", background: "#e0e7ff", borderRadius: 2, fontSize: 12 }}>
                          {expanded[p.product_id] ? "▲ Ocultar" : `▼ Ver ${p.lots.length} lote(s)`}
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin lote</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded[p.product_id] && p.lots.map((l) => (
                    <TableRow key={l.lot_id} sx={{ background: "#f8f9fc" }}>
                      <TableCell sx={{ pl: 4, color: "#666", fontSize: 13 }}>
                        └ <span style={{ fontWeight: 600 }}>{l.lot_name}</span>
                        <span style={{ marginLeft: 6, color: "#aaa" }}>{l.brand}</span>
                      </TableCell>
                      <TableCell sx={{ color: "#4f46e5", fontSize: 13 }}>{l.units_sold} uds</TableCell>
                      <TableCell sx={{ color: "#aaa", fontSize: 13 }}>—</TableCell>
                      <TableCell sx={{ color: "#aaa", fontSize: 13 }}>—</TableCell>
                      <TableCell sx={{ color: "#059669", fontSize: 13, fontWeight: 600 }}>Bs. {l.revenue.toFixed(2)}</TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#aaa" }}>
                  {search ? "No se encontraron productos" : "No hay productos vendidos aún"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>
    </Box>
  );
}