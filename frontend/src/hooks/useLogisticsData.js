import { useCallback, useEffect, useMemo, useState } from "react";
import { logisticsApi, ordersApi } from "../services/api";
import { useNotification } from "../context/NotificationContext";

const initialForm = { selected_orders: [], delivery_type: "pickup", address: "" };

export default function useLogisticsData() {
  const { notifyWarning } = useNotification();

  const [logistics, setLogistics] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState({});
  const [orderSearch, setOrderSearch] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = useCallback(() => {
    return Promise.all([logisticsApi.list(), ordersApi.list()]).then(([logisticsRes, ordersRes]) => {
      setLogistics(logisticsRes.data || []);
      setOrders(ordersRes.data || []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logisticsOrderIds = useMemo(() => new Set(logistics.map((l) => l.order_id)), [logistics]);

  const availableOrders = useMemo(
    () => orders.filter((o) => !logisticsOrderIds.has(o.id) && o.status === "payment_confirmed"),
    [orders, logisticsOrderIds]
  );

  const filteredAvailableOrders = useMemo(() => {
    const term = orderSearch.toLowerCase();
    return availableOrders.filter(
      (o) => String(o.id).includes(term) || (o.client?.full_name || "").toLowerCase().includes(term)
    );
  }, [availableOrders, orderSearch]);

  const getPendingOrdersByClient = useCallback(
    (clientId) => {
      const clientOrders = orders.filter((o) => o.client_id === clientId);
      const pendingIds = logistics
        .filter((l) => l.delivery_status !== "delivered" && l.delivery_status !== "failed")
        .map((l) => l.order_id);
      return clientOrders.filter((o) => pendingIds.includes(o.id));
    },
    [logistics, orders]
  );

  const filtered = useMemo(() => {
    return logistics
      .filter((l) => {
        const relatedOrder = orders.find((o) => o.id === l.order_id);
        const matchSearch =
          !search ||
          String(l.order_id).includes(search) ||
          (relatedOrder?.client?.full_name || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || l.delivery_status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.id - a.id);
  }, [logistics, orders, search, statusFilter]);

  const handleCreate = useCallback(async () => {
    if (!form.selected_orders?.length) {
      notifyWarning("Selecciona al menos un pedido");
      return;
    }

    for (const orderId of form.selected_orders) {
      await logisticsApi.create({
        order_id: orderId,
        delivery_type: form.delivery_type,
        address: form.address || null,
      });
    }

    setShowForm(false);
    setForm(initialForm);
    setOrderSearch("");
    await load();
  }, [form, load, notifyWarning]);

  const handleUpdate = useCallback(
    async (id) => {
      await logisticsApi.update(id, editing[id]);
      setEditing((prev) => ({ ...prev, [id]: null }));
      await load();
    },
    [editing, load]
  );

  const startEdit = useCallback((item) => {
    setEditing((prev) => ({
      ...prev,
      [item.id]: {
        delivery_status: item.delivery_status,
        tracking_notes: item.tracking_notes || "",
        address: item.address || "",
      },
    }));
  }, []);

  const cancelEdit = useCallback((id) => {
    setEditing((prev) => ({ ...prev, [id]: null }));
  }, []);

  const updateEditingField = useCallback((id, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }, []);

  const toggleOrderSelection = useCallback((orderId) => {
    setForm((prev) => {
      const current = prev.selected_orders || [];
      const isSelected = current.includes(orderId);
      return {
        ...prev,
        selected_orders: isSelected ? current.filter((id) => id !== orderId) : [...current, orderId],
      };
    });
  }, []);

  return {
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
  };
}
