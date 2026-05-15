const DEFAULT_DATE_OPTIONS = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export function formatDateEsBo(value, options = DEFAULT_DATE_OPTIONS) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-BO", options).format(date);
}

export function formatCurrencyBs(value, { digits = 2, prefix = true } = {}) {
  const amount = Number(value);
  const normalized = Number.isFinite(amount) ? amount.toFixed(digits) : Number(0).toFixed(digits);
  return prefix ? `Bs. ${normalized}` : normalized;
}