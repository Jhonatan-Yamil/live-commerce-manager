export const toDateIso = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

export const summarizeItems = (order) => {
  const items = order?.items || [];
  if (items.length === 0) return "Sin detalle";
  return items
    .map((item) => {
      const name = item.product?.name || `Producto #${item.product_id}`;
      return `${name} x${item.quantity}`;
    })
    .join(" · ");
};

export const sumItems = (order) => order?.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
