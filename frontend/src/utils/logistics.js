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

export const normalizeLocationLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (raw.toLowerCase().startsWith("otra ciudad/departamento")) return raw;

  const parts = raw
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length <= 1) return raw;

  const first = parts[0].toLowerCase();
  const allEqual = parts.every((item) => item.toLowerCase() === first);
  return allEqual ? parts[0] : raw;
};

export const normalizeTransportCompanies = (value) => {
  if (!value) return [];
  const list = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((part) => part.trim());
  return [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))];
};

export const buildOtherCityLabel = (destinationCity, transportCompanies = []) => {
  const city = String(destinationCity || "").trim();
  const carriers = normalizeTransportCompanies(transportCompanies);
  const parts = ["Otra ciudad/departamento"];
  if (city) parts.push(city);
  if (carriers.length > 0) parts.push(`Transporte: ${carriers.join(", ")}`);
  return parts.join(" - ");
};

export const extractPrintableCity = (delivery) => {
  const rawLocation = String(delivery?.location || delivery?.destination_city || delivery?.delivery_location || "").trim();
  if (!rawLocation) return "Sin destino";

  if (delivery?.location || delivery?.destination_city) {
    return normalizeLocationLabel(rawLocation);
  }

  if (rawLocation.toLowerCase().startsWith("otra ciudad/departamento")) {
    const parts = rawLocation
      .split(" - ")
      .map((part) => part.trim())
      .filter(Boolean);
    const cityPart = parts.find((part, index) => index > 0 && !part.toLowerCase().startsWith("transporte:"));
    return cityPart || "Otra ciudad";
  }

  const commaParts = rawLocation
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const candidate = commaParts.length > 0 ? commaParts[commaParts.length - 1] : rawLocation;
  const slashParts = candidate
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (slashParts.length > 1) {
    const first = slashParts[0];
    const allEqual = slashParts.every((part) => part.toLowerCase() === first.toLowerCase());
    return allEqual ? first : slashParts[slashParts.length - 1];
  }

  return candidate;
};
