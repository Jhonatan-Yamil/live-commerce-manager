import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { APP_PALETTE } from "../../theme/palette";
import { deliverySchedulesApi } from "../../services/api";
import { emitDeliverySchedulesUpdated, useDeliverySchedulesUpdates } from "../../hooks/useDeliverySchedulesUpdates";
import { buildOtherCityLabel, normalizeTransportCompanies } from "../../utils/logistics";
import { formatCurrencyBs } from "../../utils/formatters";

const todayIso = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};
const CARRIER_HISTORY_KEY = "logistics_carrier_history";
const CLIENT_CONFIGS_KEY = "logistics_client_shipping_configs";

const readCarrierHistory = () => {
  try {
    const raw = localStorage.getItem(CARRIER_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
};

const saveCarrierHistory = (values) => {
  const cleaned = [...new Set(values.map((item) => item.trim()).filter(Boolean))].slice(0, 50);
  localStorage.setItem(CARRIER_HISTORY_KEY, JSON.stringify(cleaned));
};

const readClientConfigs = () => {
  try {
    const raw = localStorage.getItem(CLIENT_CONFIGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const getClientConfig = (clientId) => {
  const configs = readClientConfigs();
  return configs[String(clientId)] || null;
};

const saveClientConfig = (clientId, config) => {
  const configs = readClientConfigs();
  configs[String(clientId)] = config;
  localStorage.setItem(CLIENT_CONFIGS_KEY, JSON.stringify(configs));
};

const createEmptyBulkDraft = () => ({
  deliveryMode: "same_city",
  location: "",
  destinationCity: "",
  carriers: [""],
  isWarehouse: false,
  notes: "",
});

const buildLocationLabel = (draft) => {
  if (draft.deliveryMode === "other_city") {
    return buildOtherCityLabel(draft.destinationCity, draft.carriers);
  }

  const parts = [draft.location || ""];
  if (draft.isWarehouse) parts.push("Almacén");
  return parts.filter(Boolean).join(" - ");
};

  const mergeDraftWithBulk = (draft, bulkDraft, order, clientHistoryLocationById) => {
    const fallbackLocation = getDefaultLocation(order, clientHistoryLocationById[order?.client_id] || "");
    const bulkHasLocation = String(bulkDraft.location || "").trim().length > 0;
    const bulkHasCity = String(bulkDraft.destinationCity || "").trim().length > 0;
    const bulkHasCarriers = (bulkDraft.carriers || []).some(c => String(c || "").trim().length > 0);
    let finalMode;
    if (bulkDraft.deliveryMode === "other_city" && (bulkHasCity || bulkHasCarriers)) {
      finalMode = "other_city";
    } else if (bulkDraft.deliveryMode === "same_city" && bulkHasLocation) {
      finalMode = "same_city";
    } else {
      finalMode = draft?.deliveryMode || "same_city";
    }

    if (finalMode === "same_city") {
      const location = String(bulkDraft.location || "").trim() 
        || String(draft?.location || "").trim() 
        || fallbackLocation 
        || "";
      return {
        ...draft,
        deliveryMode: "same_city",
        location,
        destinationCity: "",
        carriers: [""],
        isWarehouse: typeof draft?.isWarehouse === "boolean" ? draft.isWarehouse : Boolean(bulkDraft.isWarehouse),
        notes: String(bulkDraft.notes || "").trim() || draft?.notes || "",
      };
    }
    const destinationCity = String(bulkDraft.destinationCity || "").trim() 
      || String(draft?.destinationCity || "").trim() 
      || "";
    const bulkCarriers = (bulkDraft.carriers || []).map(c => String(c || "").trim()).filter(Boolean);
    const draftCarriers = (draft?.carriers || []).map(c => String(c || "").trim()).filter(Boolean);
    const carriers = bulkCarriers.length > 0 ? bulkCarriers : (draftCarriers.length > 0 ? draftCarriers : [""]);

    return {
      ...draft,
      deliveryMode: "other_city",
      location: "",
      destinationCity,
      carriers,
      isWarehouse: false,
      notes: String(bulkDraft.notes || "").trim() || draft?.notes || "",
    };
  };

const parseLocationLabel = (value) => {
  if (!value || !value.startsWith("Otra ciudad/departamento")) {
    return null;
  }

  const parts = value.split(" - ").map((part) => part.trim());
  const destinationCityPart = parts.find(
    (part, index) => index > 0 && !part.toLowerCase().startsWith("transporte:")
  );
  const destinationCity = destinationCityPart || "";
  const transportPart = parts.find((part) => part.startsWith("Transporte:"));
  const carriers = transportPart
    ? transportPart
        .replace("Transporte:", "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [""];

  return {
    deliveryMode: "other_city",
    destinationCity,
    carriers: carriers.length > 0 ? carriers : [""],
    location: "",
    isWarehouse: false,
  };
};

const getDefaultLocation = (order, clientHistory) => {
  const client = order?.client;
  const address = String(client?.address || "").trim();
  const city = String(client?.delivery_city || "").trim();
  const department = String(client?.delivery_department || "").trim();
  const structured = city && department
    ? (city.toLowerCase() === department.toLowerCase() ? city : `${city} / ${department}`)
    : (city || department);
  const historyLocation = typeof clientHistory === "string"
    ? clientHistory
    : (clientHistory?.location || "");
  return address || structured || historyLocation || "";
};

const getRememberedTransportCompanies = (remembered) => {
  const fromConfig = normalizeTransportCompanies(remembered?.transportCompanies);
  if (fromConfig.length > 0) return fromConfig;
  const fromClient = normalizeTransportCompanies(remembered?.delivery_transport_companies);
  if (fromClient.length > 0) return fromClient;
  const fromOtherCity = normalizeTransportCompanies(remembered?.otherCity?.carriers);
  if (fromOtherCity.length > 0) return fromOtherCity;
  return normalizeTransportCompanies(remembered?.carriers);
};

const getPersistedShippingConfig = (order, clientHistoryLocationById, carrierHistory) => {
  const client = order?.client || {};
  const persistedCarriers = normalizeTransportCompanies(client.delivery_transport_companies);
  const city = String(client.delivery_city || "").trim();
  const department = String(client.delivery_department || "").trim();
  const structuredCity = city && department
    ? (city.toLowerCase() === department.toLowerCase() ? city : `${city} / ${department}`)
    : (city || department);

  if (String(client.delivery_mode || "").toLowerCase() === "other_city" || persistedCarriers.length > 0) {
    return {
      deliveryMode: "other_city",
      location: "",
      destinationCity: structuredCity,
      carriers: persistedCarriers.length > 0 ? persistedCarriers : [carrierHistory[0] || ""],
      isWarehouse: false,
      notes:"",
    };
  }

  return {
    deliveryMode: "same_city",
    location: getDefaultLocation(order, clientHistoryLocationById[order?.client_id] || ""),
    destinationCity: "",
    carriers: [carrierHistory[0] || ""],
    isWarehouse: false,
    notes: String(client.notes || "").trim(),
  };
};

const getOrderDraft = (order, clientHistoryLocationById, carrierHistory) => {
  const clientId = order?.client_id;
  const remembered = clientId ? getClientConfig(clientId) : null;
  const history = clientId ? (clientHistoryLocationById[clientId] || null) : null;

  if (remembered) {
    const rememberedCarriers = getRememberedTransportCompanies(remembered);
    if (remembered.deliveryMode === "other_city") {
      return {
        deliveryMode: "other_city",
        location: "",
        destinationCity: remembered?.otherCity?.destinationCity || remembered.destinationCity || "",
        carriers: rememberedCarriers.length > 0 ? rememberedCarriers : [carrierHistory[0] || ""],
        isWarehouse: false,
        notes: "", 
      };
    }
    return {
      deliveryMode: "same_city",
      location: remembered?.sameCity?.location || remembered.location || getDefaultLocation(order, history),
      destinationCity: "",
      carriers: [carrierHistory[0] || ""],
      isWarehouse: Boolean(remembered?.sameCity?.isWarehouse ?? remembered.isWarehouse),
      notes: "", 
    };
  }

  if (history) {
    if (history.deliveryMode === "other_city") {
      return {
        deliveryMode: "other_city",
        location: "",
        destinationCity: history.destinationCity || "",
        carriers: history.transportCompanies?.length > 0 ? history.transportCompanies : [carrierHistory[0] || ""],
        isWarehouse: false,
        notes: "", 
      };
    }
    return {
      deliveryMode: "same_city",
      location: history.location || getDefaultLocation(order, history),
      destinationCity: "",
      carriers: [carrierHistory[0] || ""],
      isWarehouse: false,
      notes: "", 
    };
  }

  return getPersistedShippingConfig(order, clientHistoryLocationById, carrierHistory);
};

import { sumItems } from "../../utils/logistics";

export default function PrepareDeliveryMode({ orders, logistics = [], onUpdate }) {
  const [search, setSearch] = useState("");
  const [scheduledDate, setScheduledDate] = useState(todayIso());
  const [allSchedules, setAllSchedules] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [drafts, setDrafts] = useState({});
  const [carrierHistory, setCarrierHistory] = useState([]);
  const [bulkDraft, setBulkDraft] = useState(createEmptyBulkDraft());
  const [menuAnchor, setMenuAnchor] = useState({ anchorEl: null, orderId: null });
  const [detailsOrderId, setDetailsOrderId] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const logisticsByOrderId = useMemo(() => {
    const map = new Map();
    for (const item of logistics) map.set(item.order_id, item);
    return map;
  }, [logistics]);

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const openScheduledOrderIds = useMemo(() => {
    const deliveredOrderIds = new Set(
      (allSchedules || [])
        .filter((s) => s.status === "delivered")
        .map((s) => s.order_id)
    );
    const pendingOrderIds = new Set(
      (allSchedules || [])
        .filter((s) => s.status === "scheduled" || s.status === "rescheduled")
        .map((s) => s.order_id)
    );
    return new Set([
      ...pendingOrderIds,
      ...[...deliveredOrderIds].filter((id) => !pendingOrderIds.has(id)),
    ]);
  }, [allSchedules]);

  const failedDeliveryOrderIds = useMemo(() => {
    const pending = new Set(
      (allSchedules || [])
        .filter((s) => s.status === "scheduled" || s.status === "rescheduled")
        .map((s) => s.order_id)
    );
    return new Set(
      (allSchedules || [])
        .filter((s) => s.status === "not_delivered" && !pending.has(s.order_id))
        .map((s) => s.order_id)
    );
  }, [allSchedules]);

  const clientHistoryLocationById = useMemo(() => {
    const sorted = [...(allSchedules || [])]
      .filter((s) => s.status === "delivered")
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    const map = {};
    for (const schedule of sorted) {
      const order = orderById.get(schedule.order_id);
      const clientId = order?.client_id;
      if (!clientId || map[clientId]) continue;
      map[clientId] = {
        location: schedule.location || "",
        destinationCity: schedule.destination_city || "",
        deliveryMode: schedule.destination_city ? "other_city" : "same_city",
        transportCompanies: Array.isArray(schedule.transport_companies)
          ? schedule.transport_companies
          : (schedule.transport_companies ? [schedule.transport_companies] : []),
        rawLabel: schedule.delivery_location || "",
      };
    }
    return map;
  }, [allSchedules, orderById]);

  const manageableOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.status !== "payment_confirmed") return false;

      const relatedLogistics = logisticsByOrderId.get(order.id);
      const logisticsStatus = relatedLogistics?.delivery_status;
      const canManageByLogistics = !relatedLogistics || logisticsStatus === "in_store";
      if (!canManageByLogistics) return false;

      if (openScheduledOrderIds.has(order.id)) return false;

      return true;
    });
  }, [orders, logisticsByOrderId, openScheduledOrderIds]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return manageableOrders;
    return manageableOrders.filter((order) => {
      const client = order.client?.full_name?.toLowerCase() || "";
      const location = order.client?.address?.toLowerCase() || "";
      return String(order.id).includes(term) || client.includes(term) || location.includes(term);
    });
  }, [manageableOrders, search]);

  useEffect(() => {
    deliverySchedulesApi.list().then((res) => setAllSchedules(res.data || [])).catch(() => setAllSchedules([]));
    setCarrierHistory(readCarrierHistory());
  }, []);

  useDeliverySchedulesUpdates(() => {
    deliverySchedulesApi.list()
      .then((res) => setAllSchedules(res.data || []))
      .catch(() => setAllSchedules([]));
  });

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const order of manageableOrders) {
        if (!next[order.id]) {
          next[order.id] = getOrderDraft(order, clientHistoryLocationById, carrierHistory);
        }
      }
      return next;
    });
  }, [manageableOrders, clientHistoryLocationById, carrierHistory]);

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(orderId)) copy.delete(orderId);
      else copy.add(orderId);
      return copy;
    });
  };

  const toggleVisibleSelection = () => {
    const visibleIds = filteredOrders.map((order) => order.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedOrderIds.has(id));
    setSelectedOrderIds(allVisibleSelected ? new Set() : new Set(visibleIds));
  };

  const setDraftField = (orderId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  };

  const setCarrierAt = (orderId, index, value) => {
    setDrafts((prev) => {
      const row = prev[orderId] || {};
      const carriers = [...(row.carriers || [""])];
      carriers[index] = value;
      return {
        ...prev,
        [orderId]: { ...row, carriers },
      };
    });
  };

  const addCarrierInput = (orderId) => {
    setDrafts((prev) => {
      const row = prev[orderId] || {};
      const carriers = [...(row.carriers || [""]), ""];
      return {
        ...prev,
        [orderId]: { ...row, carriers },
      };
    });
  };

  const removeCarrierInput = (orderId, index) => {
    setDrafts((prev) => {
      const row = prev[orderId] || {};
      const carriers = [...(row.carriers || [""])];
      carriers.splice(index, 1);
      return {
        ...prev,
        [orderId]: { ...row, carriers: carriers.length > 0 ? carriers : [""] },
      };
    });
  };

  const setBulkCarrierAt = (index, value) => {
    setBulkDraft((prev) => {
      const carriers = [...(prev.carriers || [""])];
      carriers[index] = value;
      return { ...prev, carriers };
    });
  };

  const addBulkCarrierInput = () => {
    setBulkDraft((prev) => ({ ...prev, carriers: [...(prev.carriers || [""]), ""] }));
  };

  const removeBulkCarrierInput = (index) => {
    setBulkDraft((prev) => {
      const carriers = [...(prev.carriers || [""])];
      carriers.splice(index, 1);
      return { ...prev, carriers: carriers.length > 0 ? carriers : [""] };
    });
  };

  const openSecondaryMenu = (event, orderId) => {
    setMenuAnchor({ anchorEl: event.currentTarget, orderId });
  };

  const closeSecondaryMenu = () => {
    setMenuAnchor({ anchorEl: null, orderId: null });
  };

  const applySuggestedForOrder = (orderId) => {
    const order = orderById.get(orderId);
    if (!order) return;
    const suggestion = getDefaultLocation(order, clientHistoryLocationById[order.client_id] || "");
    const remembered = getClientConfig(order.client_id);
    const persisted = getPersistedShippingConfig(order, clientHistoryLocationById, carrierHistory);
    const rememberedCarriers = getRememberedTransportCompanies(remembered);
    if (remembered?.deliveryMode === "other_city" || remembered?.otherCity?.destinationCity || rememberedCarriers.length > 0 || persisted.deliveryMode === "other_city") {
      setDrafts((prev) => ({
        ...prev,
        [orderId]: {
          ...(prev[orderId] || {}),
          deliveryMode: "other_city",
          location: "",
          destinationCity: remembered?.otherCity?.destinationCity || remembered?.destinationCity || persisted.destinationCity || (prev[orderId]?.destinationCity || ""),
          carriers: rememberedCarriers.length > 0 ? rememberedCarriers : (persisted.carriers.length > 0 ? persisted.carriers : (prev[orderId]?.carriers || [carrierHistory[0] || ""])),
          isWarehouse: false,
          notes: remembered?.otherCity?.notes || remembered?.notes || persisted.notes || prev[orderId]?.notes || "",
        },
      }));
    } else {
      setDrafts((prev) => ({
        ...prev,
        [orderId]: {
          ...(prev[orderId] || {}),
          deliveryMode: "same_city",
          location: remembered?.sameCity?.location || remembered?.location || persisted.location || suggestion,
          destinationCity: "",
          carriers: [carrierHistory[0] || ""],
          isWarehouse: Boolean(remembered?.sameCity?.isWarehouse ?? remembered?.isWarehouse ?? persisted.isWarehouse),
          notes: remembered?.sameCity?.notes || remembered?.notes || persisted.notes || prev[orderId]?.notes || "",
        },
      }));
    }
    closeSecondaryMenu();
  };

  const setModeForOrder = (orderId, mode) => {
    const order = orderById.get(orderId);
    const remembered = order?.client_id ? getClientConfig(order.client_id) : null;
    const persisted = getPersistedShippingConfig(order, clientHistoryLocationById, carrierHistory);
    setDrafts((prev) => {
      const current = prev[orderId] || {};
      if (mode === "other_city") {
        return {
          ...prev,
          [orderId]: {
            ...current,
            deliveryMode: "other_city",
            location: "",
            destinationCity: current.destinationCity || remembered?.otherCity?.destinationCity || remembered?.destinationCity || persisted.destinationCity || "",
            carriers:
              Array.isArray(current.carriers) && current.carriers.length > 0
                ? current.carriers
                : (getRememberedTransportCompanies(remembered).length > 0
                  ? getRememberedTransportCompanies(remembered)
                  : (persisted.carriers.length > 0 ? persisted.carriers : [carrierHistory[0] || ""])),
            isWarehouse: false,
          },
        };
      }

      return {
        ...prev,
        [orderId]: {
          ...current,
          deliveryMode: "same_city",
          location: current.location || remembered?.sameCity?.location || remembered?.location || persisted.location || getDefaultLocation(order, clientHistoryLocationById[order?.client_id] || ""),
          destinationCity: "",
          carriers: [carrierHistory[0] || ""],
          isWarehouse: Boolean(current.isWarehouse ?? remembered?.sameCity?.isWarehouse ?? remembered?.isWarehouse ?? persisted.isWarehouse),
        },
      };
    });
    closeSecondaryMenu();
  };

  const openDetails = (orderId) => {
    setDetailsOrderId(orderId);
  };

  const closeDetails = () => {
    setDetailsOrderId(null);
  };

  const openCreateDialog = () => {
      if (selectedOrderIds.size === 0) return;
      setDrafts((prev) => {
        const next = { ...prev };
        for (const orderId of selectedOrderIds) {
          if (!next[orderId]) {
            const order = orderById.get(orderId);
            next[orderId] = getOrderDraft(order, clientHistoryLocationById, carrierHistory);
          }
        }
        return next;
      });
      
      setCreateDialogOpen(true);
  };

  const handleCreateSchedules = async () => {
    setCreating(true);
    try {
      const usedCarriers = [];

      for (const orderId of selectedOrderIds) {
        const order = orderById.get(orderId);
        const individualDraft = drafts[orderId] ?? getOrderDraft(order, clientHistoryLocationById, carrierHistory);
        const draft = mergeDraftWithBulk(individualDraft, bulkDraft, order, clientHistoryLocationById);
        console.log("orderId:", orderId);
        console.log("drafts[orderId]:", drafts[orderId]);       // ← ¿qué tiene?
        console.log("bulkDraft:", bulkDraft);                   // ← ¿tiene valores viejos?
        console.log("draft merged:", draft);  
        if (!draft) continue;

        const deliveryLocation = draft.deliveryMode === "other_city"
          ? buildOtherCityLabel(draft.destinationCity || "", draft.carriers || [])
          : String(draft.location || getDefaultLocation(order, clientHistoryLocationById[order?.client_id] || "") || "").trim();

        const apiPayload = {
          order_id: orderId,
          scheduled_date: scheduledDate,
          delivery_location: deliveryLocation,
          delivery_mode: draft.deliveryMode,
          transport_companies: draft.deliveryMode === "other_city" ? (draft.carriers || []).map((item) => item.trim()).filter(Boolean) : [],
          notes: draft.notes || null,
        };

        if (draft.deliveryMode === "same_city") {
          apiPayload.location = draft.location || "";
          apiPayload.destination_city = null;
        } else {
          apiPayload.location = null;
          apiPayload.destination_city = draft.destinationCity || "";
        }

        await deliverySchedulesApi.create(apiPayload);

        if (order?.client_id) {
          saveClientConfig(order.client_id, {
            deliveryMode: draft.deliveryMode || "same_city",
            location: draft.deliveryMode === "same_city" ? (draft.location || "") : "",
            destinationCity: draft.deliveryMode === "other_city" ? (draft.destinationCity || "") : "",
            carriers: draft.deliveryMode === "other_city" ? (draft.carriers || []).map((item) => item.trim()).filter(Boolean) : [],
            isWarehouse: draft.deliveryMode === "same_city" ? Boolean(draft.isWarehouse) : false,
            notes: draft.notes || "",
            transportCompanies: draft.deliveryMode === "other_city" ? (draft.carriers || []).map((item) => item.trim()).filter(Boolean) : [],
            sameCity:
              draft.deliveryMode === "same_city"
                ? {
                    location: draft.location || "",
                    isWarehouse: Boolean(draft.isWarehouse),
                    notes: draft.notes || "",
                  }
                : undefined,
            otherCity:
              draft.deliveryMode === "other_city"
                ? {
                    destinationCity: draft.destinationCity || "",
                    carriers: (draft.carriers || []).map((item) => item.trim()).filter(Boolean),
                    notes: draft.notes || "",
                  }
                : undefined,
          });
        }

        if (draft.deliveryMode === "other_city") {
          usedCarriers.push(...(draft.carriers || []).map((item) => item.trim()).filter(Boolean));
        }
      }

      if (usedCarriers.length > 0) {
        const merged = [...new Set([...carrierHistory, ...usedCarriers])];
        saveCarrierHistory(merged);
        setCarrierHistory(merged);
      }

      setCreateDialogOpen(false);
      setSelectedOrderIds(new Set());
      setDrafts({});
      setBulkDraft(createEmptyBulkDraft());
      const schedulesRes = await deliverySchedulesApi.list();
      setAllSchedules(schedulesRes.data || []);
      await onUpdate?.();
      emitDeliverySchedulesUpdated();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
      <Typography variant="h6" fontWeight={700} color={APP_PALETTE.text.primary} mb={0.5}>
        Modo preparación de entregas (global)
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Selecciona pedidos pagados no entregados de cualquier cliente, aplica configuración masiva y prográmalos de una sola vez.
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 1.25, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          sx={{ minWidth: 280 }}
          placeholder="Buscar por cliente, dirección o # de pedido"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="Fecha de entrega"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Chip color="primary" label={`${selectedOrderIds.size} seleccionado(s)`} />
        <Button size="small" variant="text" onClick={toggleVisibleSelection} disabled={filteredOrders.length === 0}>
          {filteredOrders.length > 0 && filteredOrders.every((order) => selectedOrderIds.has(order.id))
            ? "Deseleccionar todos"
            : "Seleccionar todos"}
        </Button>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
        <Button
          size="large"
          variant="contained"
          onClick={openCreateDialog}
          disabled={selectedOrderIds.size === 0}
          sx={{ minWidth: 280, borderRadius: 3, py: 1.1 }}
        >
          Programar {selectedOrderIds.size} pedido(s)
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}>
        <Typography fontWeight={700} fontSize={13} mb={1}>
          Configuración masiva
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1, mb: 1 }}>
          <TextField
            select
            size="small"
            label="Tipo"
            value={bulkDraft.deliveryMode}
            onChange={(e) => setBulkDraft((prev) => ({ ...prev, deliveryMode: e.target.value }))}
          >
            <MenuItem value="same_city">Misma ciudad</MenuItem>
            <MenuItem value="other_city">Otra ciudad / departamento</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Notas"
            value={bulkDraft.notes}
            onChange={(e) => setBulkDraft((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </Box>

        {bulkDraft.deliveryMode === "same_city" ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1, mb: 1 }}>
            <TextField
              size="small"
              label="Lugar / Dirección"
              value={bulkDraft.location}
              onChange={(e) => setBulkDraft((prev) => ({ ...prev, location: e.target.value }))}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
              <Checkbox
                checked={Boolean(bulkDraft.isWarehouse)}
                onChange={(e) => setBulkDraft((prev) => ({ ...prev, isWarehouse: e.target.checked }))}
              />
              <Typography variant="body2">Es almacén</Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 1, mb: 1 }}>
            <TextField
              size="small"
              label="Ciudad / Departamento"
              value={bulkDraft.destinationCity}
              onChange={(e) => setBulkDraft((prev) => ({ ...prev, destinationCity: e.target.value }))}
            />
            {(bulkDraft.carriers || [""]).map((carrier, index) => (
              <Box key={`bulk-carrier-${index}`} sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label={`Empresa de transporte ${index + 1}`}
                  value={carrier}
                  onChange={(e) => setBulkCarrierAt(index, e.target.value)}
                  inputProps={{ list: "carrier-suggestions" }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  disabled={(bulkDraft.carriers || []).length <= 1}
                  onClick={() => removeBulkCarrierInput(index)}
                >
                  Quitar
                </Button>
              </Box>
            ))}
            <Button variant="outlined" onClick={addBulkCarrierInput} sx={{ width: "fit-content" }}>
              Agregar empresa
            </Button>
          </Box>
        )}

      </Paper>

      <datalist id="carrier-suggestions">
        {carrierHistory.map((carrier) => (
          <option key={carrier} value={carrier} />
        ))}
      </datalist>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
        {filteredOrders.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No hay pedidos disponibles para preparación en este momento.
          </Typography>
        )}

        {filteredOrders.map((order) => {
          const draft = drafts[order.id] || getOrderDraft(order, clientHistoryLocationById, carrierHistory);
          const isSelected = selectedOrderIds.has(order.id);
          const totalItems = sumItems(order) || order.items?.length || 0;

          return (
            <Box
              key={order.id}
              sx={{
                border: `1px solid ${isSelected ? APP_PALETTE.brand.primary : APP_PALETTE.surfaces.border}`,
                background: isSelected ? APP_PALETTE.brand.soft : APP_PALETTE.surfaces.subtle,
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Checkbox checked={isSelected} onChange={() => toggleOrderSelection(order.id)} />
                  <Box>
                    <Typography fontWeight={700}>
                      {order.client?.full_name || "Sin cliente"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Pedido #{order.id} · {totalItems} prenda(s) · {formatCurrencyBs(order.total)}
                    </Typography>
                    {failedDeliveryOrderIds.has(order.id) && (
                      <Chip
                        size="small"
                        label="Entrega anterior no completada"
                        sx={{
                          mt: 0.5,
                          height: 20,
                          fontSize: 11,
                          fontWeight: 500,
                          color: "text.secondary",
                          background: "transparent",
                          border: "0.5px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Button size="small" variant="outlined" onClick={() => openDetails(order.id)}>
                    Ver / editar
                  </Button>
                  <IconButton size="small" onClick={(event) => openSecondaryMenu(event, order.id)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary">
                {draft.deliveryMode === "other_city"
                  ? `Otra ciudad: ${draft.destinationCity || "sin definir"}`
                  : `Lugar: ${draft.location || getDefaultLocation(order, clientHistoryLocationById[order.client_id] || "")}`}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Menu
        anchorEl={menuAnchor.anchorEl}
        open={Boolean(menuAnchor.anchorEl)}
        onClose={closeSecondaryMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => applySuggestedForOrder(menuAnchor.orderId)}>Restaurar sugerencia del cliente</MenuItem>
        <MenuItem onClick={() => setModeForOrder(menuAnchor.orderId, "same_city")}>Marcar como misma ciudad</MenuItem>
        <MenuItem onClick={() => setModeForOrder(menuAnchor.orderId, "other_city")}>Marcar como otra ciudad</MenuItem>
      </Menu>

      <Dialog open={Boolean(detailsOrderId)} onClose={closeDetails} fullWidth maxWidth="md">
        {detailsOrderId && (() => {
          const order = orderById.get(detailsOrderId);
          const draft = drafts[detailsOrderId] || getOrderDraft(order, clientHistoryLocationById, carrierHistory);
          const totalItems = sumItems(order) || order?.items?.length || 0;
          return (
            <>
              <DialogTitle>
                {order?.client?.full_name || "Pedido"} - Pedido #{order?.id}
              </DialogTitle>
              <DialogContent>
                <Box sx={{ display: "grid", gap: 1.5, mt: 1 }}>
                  <TextField
                    select
                    size="small"
                    label="Tipo"
                    value={draft.deliveryMode || "same_city"}
                    onChange={(e) => setDraftField(detailsOrderId, "deliveryMode", e.target.value)}
                  >
                    <MenuItem value="same_city">Misma ciudad</MenuItem>
                    <MenuItem value="other_city">Otra ciudad / departamento</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    label="Notas"
                    value={draft.notes || ""}
                    onChange={(e) => setDraftField(detailsOrderId, "notes", e.target.value)}
                  />
                  {draft.deliveryMode === "other_city" ? (
                    <Box sx={{ display: "grid", gap: 1 }}>
                      <TextField
                        size="small"
                        label="Ciudad / Departamento"
                        value={draft.destinationCity || ""}
                        onChange={(e) => setDraftField(detailsOrderId, "destinationCity", e.target.value)}
                      />
                      {(draft.carriers || [""]).map((carrier, index) => (
                        <Box key={`detail-${detailsOrderId}-carrier-${index}`} sx={{ display: "flex", gap: 1 }}>
                          <TextField
                            size="small"
                            fullWidth
                            label={`Empresa de transporte ${index + 1}`}
                            value={carrier}
                            onChange={(e) => setCarrierAt(detailsOrderId, index, e.target.value)}
                            inputProps={{ list: "carrier-suggestions" }}
                          />
                          <Button
                            variant="outlined"
                            color="error"
                            disabled={(draft.carriers || []).length <= 1}
                            onClick={() => removeCarrierInput(detailsOrderId, index)}
                          >
                            Quitar
                          </Button>
                        </Box>
                      ))}
                      <Button variant="outlined" onClick={() => addCarrierInput(detailsOrderId)} sx={{ width: "fit-content" }}>
                        Agregar empresa
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                      <TextField
                        size="small"
                        label="Lugar / Dirección"
                        value={draft.location || ""}
                        onChange={(e) => setDraftField(detailsOrderId, "location", e.target.value)}
                        helperText={getDefaultLocation(order, clientHistoryLocationById[order?.client_id] || "") || "Sin referencia previa"}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
                        <Checkbox checked={Boolean(draft.isWarehouse)} onChange={(e) => setDraftField(detailsOrderId, "isWarehouse", e.target.checked)} />
                        <Typography variant="body2">Es almacén</Typography>
                      </Box>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {totalItems} prenda(s) · {formatCurrencyBs(order?.total)}
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDetails}>Cerrar</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Confirmar programación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Se crearán {selectedOrderIds.size} programación(es) para la fecha {scheduledDate}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateSchedules} disabled={creating}>
            Crear programación
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
