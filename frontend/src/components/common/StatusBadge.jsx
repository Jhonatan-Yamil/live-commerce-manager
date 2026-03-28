export default function StatusBadge({ label, color }) {
  return (
    <span style={{
      background: color + "20",
      color,
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 12,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}