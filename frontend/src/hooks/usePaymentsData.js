import { useCallback, useEffect, useRef, useState } from "react";
import { intakeApi, ordersApi, paymentsApi } from "../services/api";
import { useNotification } from "../context/NotificationContext";

export default function usePaymentsData() {
  const { notifyError, notifyWarning } = useNotification();
  const [payments, setPayments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notes, setNotes] = useState({});
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [reassignOrder, setReassignOrder] = useState({});
  const [processingAction, setProcessingAction] = useState({});
  const [showReassign, setShowReassign] = useState({});
  const [completionSuggestion, setCompletionSuggestion] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (withIndicator = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (withIndicator) setIsRefreshing(true);

    try {
      const [paymentsRes, suggestionsRes, ordersRes] = await Promise.all([
        paymentsApi.list(),
        intakeApi.listSuggestions(),
        ordersApi.list(),
      ]);

      setPayments(paymentsRes.data);
      setSuggestions((suggestionsRes.data || []).sort((a, b) => b.id - a.id));
      setOrders((ordersRes.data || []).sort((a, b) => b.id - a.id));
      setLastUpdatedAt(new Date());
    } finally {
      if (withIndicator) setIsRefreshing(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };

    const interval = setInterval(refreshIfVisible, 10000);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [load]);

  const changeStatus = useCallback(
    async (id, status) => {
      await paymentsApi.updateStatus(id, { status, notes: notes[id] || null });
      await load();
    },
    [notes, load]
  );

  const uploadVoucher = useCallback(
    async (orderId) => {
      const file = files[orderId];
      if (!file) {
        notifyWarning("Selecciona un archivo primero");
        return;
      }

      setUploading((prev) => ({ ...prev, [orderId]: true }));
      try {
        await paymentsApi.uploadVoucher(orderId, file);
        setFiles((prev) => ({ ...prev, [orderId]: null }));
        await load();
      } catch {
        notifyError("Error al subir el comprobante");
      } finally {
        setUploading((prev) => ({ ...prev, [orderId]: false }));
      }
    },
    [files, load, notifyError, notifyWarning]
  );

  const handleSuggestionAction = useCallback(
    async (intakeId, action) => {
      setProcessingAction((prev) => ({ ...prev, [intakeId]: true }));
      try {
        if (action === "confirm") {
          await intakeApi.confirm(intakeId);
        } else if (action === "reject") {
          await intakeApi.reject(intakeId);
        } else if (action === "reprocess") {
          await intakeApi.reprocess(intakeId);
        } else if (action === "reassign") {
          const selected = reassignOrder[intakeId];
          if (!selected?.id) {
            notifyWarning("Selecciona un pedido sugerido para reasignar");
            return;
          }
          await intakeApi.reassign(intakeId, selected.id);
        }
        await load();
      } catch {
        notifyError("No se pudo completar la acción sobre la sugerencia");
      } finally {
        setProcessingAction((prev) => ({ ...prev, [intakeId]: false }));
      }
    },
    [load, notifyError, notifyWarning, reassignOrder]
  );

  return {
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
  };
}
