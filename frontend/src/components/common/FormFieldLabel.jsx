export default function FormFieldLabel({ label, required = false, showRequired = false, style, children }) {
  const text = required && showRequired ? `${label} *` : label;

  return (
    <label style={style}>
      {text}
      {children}
    </label>
  );
}
