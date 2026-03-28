import { Box, TextField, MenuItem, Button, Typography } from "@mui/material";

export default function SearchBar({
  search,
  onSearchChange,
  filters = [],
  onClear,
  resultCount,
}) {
  const hasActiveFilters = search || filters.some((f) => f.value && f.value !== f.defaultValue);

  return (
    <Box sx={{
      background: "#fff",
      borderRadius: 3,
      p: 2,
      mb: 2,
      boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
      display: "flex",
      gap: 1.5,
      flexWrap: "wrap",
      alignItems: "center",
    }}>
      <TextField
        size="small"
        placeholder="Buscar..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ width: 240 }}
      />

      {filters.map((f) =>
        f.type === "select" ? (
          <TextField
            key={f.key}
            select
            size="small"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            sx={{ width: f.width || 180 }}
            label={f.label}
          >
            {f.options.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        ) : f.type === "date" ? (
          <TextField
            key={f.key}
            size="small"
            type="date"
            label={f.label}
            InputLabelProps={{ shrink: true }}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
          />
        ) : null
      )}

      {hasActiveFilters && onClear && (
        <Button size="small" onClick={onClear} sx={{ color: "#666" }}>
          Limpiar
        </Button>
      )}

      {resultCount !== undefined && (
        <Typography variant="caption" color="text.secondary">
          {resultCount} resultado(s)
        </Typography>
      )}
    </Box>
  );
}