import { useCallback, useMemo, useState } from "react";

export default function useCrudForm({
  initialForm,
  loadData,
  createItem,
  updateItem,
  mapToForm,
  mapToPayload,
  validateCreate,
}) {
  const initialState = useMemo(() => ({ ...initialForm }), [initialForm]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialState);

  const resetForm = useCallback(() => {
    setEditing(null);
    setForm({ ...initialState });
  }, [initialState]);

  const openCreate = useCallback(() => {
    setShowForm(true);
    setEditing(null);
    setForm({ ...initialState });
  }, [initialState]);

  const toggleCreate = useCallback(() => {
    setShowForm((prev) => {
      const next = !prev;
      if (next) {
        setEditing(null);
        setForm({ ...initialState });
      }
      return next;
    });
  }, [initialState]);

  const openEdit = useCallback(
    (item) => {
      setEditing(item);
      setShowForm(true);
      setForm(mapToForm ? mapToForm(item) : { ...item });
    },
    [mapToForm]
  );

  const closeForm = useCallback(() => {
    setShowForm(false);
    resetForm();
  }, [resetForm]);

  const submitForm = useCallback(async () => {
    if (editing) {
      const updatePayload = mapToPayload ? mapToPayload(form, true) : form;
      await updateItem(editing.id, updatePayload);
    } else {
      if (validateCreate) {
        const valid = validateCreate(form);
        if (!valid) return;
      }
      const createPayload = mapToPayload ? mapToPayload(form, false) : form;
      await createItem(createPayload);
    }

    closeForm();
    await loadData();
  }, [
    editing,
    form,
    mapToPayload,
    updateItem,
    validateCreate,
    createItem,
    closeForm,
    loadData,
  ]);

  return {
    showForm,
    setShowForm,
    editing,
    form,
    setForm,
    openCreate,
    toggleCreate,
    openEdit,
    closeForm,
    submitForm,
    reload: loadData,
  };
}
