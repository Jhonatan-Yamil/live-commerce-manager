import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import OrderForm from "./OrderForm";
import { clientsApi, intakeApi, lotsApi, ordersApi, productsApi } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const emptyItem = () => ({ product_name: "", quantity: 1, unit_price: "", lot_id: null, lot_input: "" });

export default function OrderCompletionDialog({ open, suggestion, onClose, onCompleted }) {
  const { notifyError, notifyWarning } = useNotification();
  const isIntakeMode = Boolean(suggestion);
  const [clients, setClients] = useState([]);
  const [lots, setLots] = useState([]);
  const [productNames, setProductNames] = useState([]);

  const [clientInput, setClientInput] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientPhone, setClientPhone] = useState("");
  const [form, setForm] = useState({ notes: "", items: [emptyItem()] });
  const [loading, setLoading] = useState(false);
  const [allowTotalOverride, setAllowTotalOverride] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([clientsApi.list(), lotsApi.list(), productsApi.names()]).then(([c, l, p]) => {
      setClients(c.data || []);
      setLots(l.data || []);
      setProductNames(p.data || []);
    });
  }, [open]);

  useEffect(() => {
    if (!open || !suggestion) return;

    const prefillName = suggestion.matched_client_name || suggestion.extracted_sender_name || "Cliente provisional";
    const prefillNotes = suggestion.extracted_reference
      ? `Completar pedido desde intake #${suggestion.id} (Ref ${suggestion.extracted_reference})`
      : `Completar pedido desde intake #${suggestion.id}`;

    setClientInput(prefillName);
    setForm({ notes: prefillNotes, items: [emptyItem()] });
    setAllowTotalOverride(false);
    setSubmitAttempted(false);

    const existing = (clients || []).find((c) => c.id === suggestion.matched_client_id);
    if (existing && !(suggestion.matched_client_is_provisional)) {
      setSelectedClient(existing);
      setClientPhone(existing.phone || "");
    } else {
      setSelectedClient(null);
      setClientPhone("");
    }
  }, [open, suggestion, clients]);

  useEffect(() => {
    if (!open || isIntakeMode) return;
    setClientInput("");
    setSelectedClient(null);
    setClientPhone("");
    setForm({ notes: "", items: [emptyItem()] });
    setAllowTotalOverride(false);
    setSubmitAttempted(false);
  }, [open, isIntakeMode]);

  const total = useMemo(
    () => form.items.reduce((sum, i) => sum + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity, 10) || 0), 0),
    [form.items]
  );

  const expectedAmount = isIntakeMode ? (suggestion?.extracted_amount ?? null) : null;
  const mismatch = expectedAmount !== null && Math.abs(total - Number(expectedAmount)) > 0.01;

  const handleClientInputChange = (val) => {
    setClientInput(val);
    setSelectedClient(null);
    setClientPhone("");
  };

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setClientInput(c.full_name);
    setClientPhone(c.phone || "");
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (i) => setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[i] = { ...items[i], [field]: val };
      return { ...prev, items };
    });
  };
  const selectLot = (i, lot) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[i] = { ...items[i], lot_id: lot.id, lot_input: lot.name };
      return { ...prev, items };
    });
  };
  const clearLot = (i) => {
    updateItem(i, "lot_id", null);
    updateItem(i, "lot_input", "");
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    if (mismatch && !allowTotalOverride) {
      notifyWarning("El total no coincide con el comprobante. Activa la confirmación de excepción para continuar.");
      return;
    }

    if (form.items.some((i) => !i.lot_id)) {
      notifyWarning("Debes asignar un lote a todos los productos");
      return;
    }

    setLoading(true);
    try {
      let clientId = selectedClient?.id;
      if (!clientId) {
        if (!clientPhone.trim()) {
          notifyWarning("Debes ingresar celular para cliente nuevo/provisional");
          return;
        }
        const c = await clientsApi.create({ full_name: clientInput.trim(), phone: clientPhone.trim() });
        clientId = c.data.id;
      }

      const payload = {
        client_id: clientId,
        notes: form.notes || null,
        items: form.items.map((i) => ({
          product_name: i.product_name,
          quantity: parseInt(i.quantity, 10),
          unit_price: parseFloat(i.unit_price),
          lot_id: i.lot_id,
        })),
      };

      const newOrder = await ordersApi.create(payload);
      if (isIntakeMode && suggestion) {
        await intakeApi.reassign(suggestion.id, newOrder.data.id);
      }
      onCompleted?.();
      onClose?.();
    } catch {
      notifyError("No se pudo completar el pedido desde la sugerencia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{isIntakeMode ? "Completar pedido desde comprobante" : "Nuevo pedido"}</DialogTitle>
      <DialogContent>
        {isIntakeMode && suggestion && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Intake #{suggestion.id} - Cliente: {suggestion.matched_client_name || "No identificado"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monto comprobante: Bs. {suggestion.extracted_amount ?? "-"} - Referencia: {suggestion.extracted_reference || "-"}
            </Typography>
          </Box>
        )}

        {mismatch && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            El total de productos (Bs. {total.toFixed(2)}) no coincide con el comprobante (Bs. {Number(expectedAmount).toFixed(2)}).
          </Alert>
        )}

        {isIntakeMode && (
          <FormControlLabel
            sx={{ mb: 1 }}
            control={<Checkbox checked={allowTotalOverride} onChange={(e) => setAllowTotalOverride(e.target.checked)} />}
            label="Permitir excepción de total (requiere validación manual del vendedor)"
          />
        )}

        <OrderForm
          clients={clients}
          lots={lots}
          productNames={productNames}
          clientInput={clientInput}
          selectedClient={selectedClient}
          clientPhone={clientPhone}
          form={form}
          loading={loading}
          showRequiredLabels={submitAttempted}
          onClientInputChange={handleClientInputChange}
          onSelectClient={handleSelectClient}
          onClientPhoneChange={setClientPhone}
          onFormNotesChange={(value) => setForm({ ...form, notes: value })}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onSelectLot={selectLot}
          onClearLot={clearLot}
          onSubmit={handleSubmit}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <Button onClick={onClose}>Cerrar</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
