import { Box, Button, Paper, Typography } from "@mui/material";
import SearchBar from "../components/common/SearchBar";
import TablePager from "../components/common/TablePager";
import PrepareDeliveryMode from "../components/logistics/PrepareDeliveryMode";
import LogisticsCreateForm from "../components/logistics/LogisticsCreateForm";
import LogisticsRecordCard from "../components/logistics/LogisticsRecordCard";
import useLogisticsData from "../hooks/useLogisticsData";

export default function LogisticsPage() {
  const {
    logistics,
    orders,
    showForm,
    setShowForm,
    form,
    setForm,
    editing,
    orderSearch,
    setOrderSearch,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filtered,
    filteredAvailableOrders,
    getPendingOrdersByClient,
    handleCreate,
    handleUpdate,
    startEdit,
    cancelEdit,
    updateEditingField,
    toggleOrderSelection,
    load,
  } = useLogisticsData();

  const statusFilters = [
    {
      key: "deliveryStatus",
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
        { value: "in_store", label: "En tienda" },
        { value: "sent", label: "Enviado" },
        { value: "delivered", label: "Entregado" },
        { value: "failed", label: "Fallido" },
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="#1a1a2e">Logística</Typography>
        <Button variant="contained" onClick={() => setShowForm(!showForm)}
          sx={{ background: "#4f46e5", "&:hover": { background: "#4338ca" }, borderRadius: 2 }}>
          {showForm ? "Cancelar" : "+ Nuevo envío"}
        </Button>
      </Box>

      {showForm && (
        <LogisticsCreateForm
          form={form}
          setForm={setForm}
          orderSearch={orderSearch}
          setOrderSearch={setOrderSearch}
          filteredAvailableOrders={filteredAvailableOrders}
          onToggleOrder={toggleOrderSelection}
          onCreate={handleCreate}
        />
      )}

      <PrepareDeliveryMode orders={orders} logistics={logistics} onUpdate={load} />

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
        {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((l) => {
          const relatedOrder = orders.find((o) => o.id === l.order_id);
          const clientId = relatedOrder?.client_id;
          const pendingOrders = clientId ? getPendingOrdersByClient(clientId) : [];
          const editValue = editing[l.id] || null;

          return (
            <LogisticsRecordCard
              key={l.id}
              item={l}
              relatedOrder={relatedOrder}
              pendingOrders={pendingOrders}
              editValue={editValue}
              onStartEdit={() => startEdit(l)}
              onCancelEdit={() => cancelEdit(l.id)}
              onEditField={(field, value) => updateEditingField(l.id, field, value)}
              onSave={() => handleUpdate(l.id)}
            />
          );
        })}
        {filtered.length === 0 && (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <Typography color="text.secondary">No hay registros de logística</Typography>
          </Paper>
        )}
      </Box>

      {filtered.length > rowsPerPage && (
        <TablePager count={filtered.length} page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
        />
      )}
    </Box>
  );
}