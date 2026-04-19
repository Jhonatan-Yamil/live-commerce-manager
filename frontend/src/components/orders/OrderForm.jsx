import { Box, Button, Paper, Typography } from "@mui/material";
import ClientAutocomplete from "./ClientAutocomplete";
import LotAutocomplete from "./LotAutocomplete";
import ProductAutocomplete from "./ProductAutocomplete";

export default function OrderForm({
	clients,
	lots,
	productNames,
	clientInput,
	selectedClient,
	clientPhone,
	form,
	loading,
	onClientInputChange,
	onSelectClient,
	onClientPhoneChange,
	onFormNotesChange,
	onAddItem,
	onRemoveItem,
	onUpdateItem,
	onSelectLot,
	onClearLot,
	onSubmit,
}) {
	const isNewClient = !selectedClient && clientInput.trim().length > 0;
	const missingPhoneForNewClient = isNewClient && !clientPhone.trim();

	const total = form.items.reduce(
		(sum, i) => sum + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0),
		0
	);

	const inputStyle = {
		width: "100%",
		padding: "8px 10px",
		border: "1px solid #ddd",
		borderRadius: 6,
		fontSize: 14,
		boxSizing: "border-box",
	};

	const labelStyle = {
		display: "block",
		marginBottom: 4,
		fontWeight: 500,
		color: "#555",
		fontSize: 13,
	};

	return (
		<Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
			<Typography variant="h6" fontWeight={600} color="#333" mb={2.5}>
				Registrar nuevo pedido
			</Typography>

			<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2.5 }}>
				<div>
					<label style={labelStyle}>
						Cliente *
						{selectedClient && (
							<span
								style={{
									marginLeft: 8,
									background: "#d1fae5",
									color: "#059669",
									borderRadius: 20,
									padding: "1px 8px",
									fontSize: 11,
									fontWeight: 600,
								}}
							>
								Cliente existente
							</span>
						)}
						{!selectedClient && clientInput && (
							<span
								style={{
									marginLeft: 8,
									background: "#fef3c7",
									color: "#d97706",
									borderRadius: 20,
									padding: "1px 8px",
									fontSize: 11,
									fontWeight: 600,
								}}
							>
								Se creara nuevo
							</span>
						)}
					</label>

					<ClientAutocomplete
						clients={clients}
						value={clientInput}
						onChange={onClientInputChange}
						onSelect={onSelectClient}
					/>

					{!selectedClient && clientInput && (
						<div style={{ marginTop: 10 }}>
							<label style={labelStyle}>Celular del cliente *</label>
							<input
								value={clientPhone}
								onChange={(e) => onClientPhoneChange(e.target.value)}
								style={inputStyle}
								placeholder="+591 7..."
							/>
							<Typography sx={{ mt: 0.5, fontSize: 12, color: "#b45309" }}>
								Obligatorio para registrar cliente nuevo
							</Typography>
						</div>
					)}
				</div>

				<div>
					<label style={labelStyle}>Notas</label>
					<input
						value={form.notes}
						onChange={(e) => onFormNotesChange(e.target.value)}
						style={inputStyle}
						placeholder="Observaciones del pedido..."
					/>
				</div>
			</Box>

			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
				<Typography fontWeight={600} color="#333">
					Productos
				</Typography>
				<Button
					size="small"
					variant="outlined"
					onClick={onAddItem}
					sx={{ color: "#4f46e5", borderColor: "#4f46e5", borderRadius: 2 }}
				>
					+ Agregar item
				</Button>
			</Box>

			<Box
				sx={{
					background: "#f8f9fc",
					borderRadius: 2,
					p: 1.5,
					display: "flex",
					flexDirection: "column",
					gap: 1.5,
				}}
			>
				{form.items.map((item, i) => (
					<Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
						<Box sx={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 1.5, alignItems: "end", mb: 1 }}>
							<div>
								{i === 0 && <label style={labelStyle}>Descripcion del producto</label>}
								<ProductAutocomplete
									products={productNames}
									value={item.product_name}
									onChange={(val) => onUpdateItem(i, "product_name", val)}
									onSelect={(p) => onUpdateItem(i, "product_name", p.name)}
								/>
							</div>

							<div>
								{i === 0 && <label style={labelStyle}>Cantidad</label>}
								<input
									type="number"
									min="1"
									value={item.quantity}
									onChange={(e) => onUpdateItem(i, "quantity", e.target.value)}
									style={inputStyle}
								/>
							</div>

							<div>
								{i === 0 && <label style={labelStyle}>Precio (Bs.)</label>}
								<input
									type="number"
									step="0.01"
									min="0"
									value={item.unit_price}
									onChange={(e) => onUpdateItem(i, "unit_price", e.target.value)}
									style={inputStyle}
									placeholder="0.00"
								/>
							</div>

							<button
								onClick={() => onRemoveItem(i)}
								disabled={form.items.length === 1}
								style={{
									padding: "8px 10px",
									background: form.items.length === 1 ? "#f5f5f5" : "#fee2e2",
									color: form.items.length === 1 ? "#ccc" : "#dc2626",
									border: "none",
									borderRadius: 6,
									cursor: form.items.length === 1 ? "not-allowed" : "pointer",
									marginTop: i === 0 ? 20 : 0,
								}}
							>
								x
							</button>
						</Box>

						<div>
						<label style={labelStyle}>Lote *</label>
							<LotAutocomplete
								lots={lots}
								value={item.lot_input}
								onChange={(val) => onUpdateItem(i, "lot_input", val)}
								onSelect={(lot) => onSelectLot(i, lot)}
								onClear={() => onClearLot(i)}
							/>
						</div>
					</Paper>
				))}
			</Box>

			<Box
				sx={{
					borderTop: "1px solid #f0f0f0",
					pt: 2,
					mt: 2,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<Typography>
					<span style={{ color: "#888", fontSize: 13 }}>{form.items.length} item(s) - </span>
					<span style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Total: Bs. {total.toFixed(2)}</span>
				</Typography>

				<Button
					variant="contained"
					onClick={onSubmit}
					disabled={loading || !clientInput || missingPhoneForNewClient || form.items.some((i) => !i.product_name || !i.unit_price || !i.lot_id)}
					sx={{
						background: "#4f46e5",
						"&:hover": { background: "#4338ca" },
						borderRadius: 2,
						opacity: loading || !clientInput || missingPhoneForNewClient || form.items.some((i) => !i.product_name || !i.unit_price || !i.lot_id) ? 0.6 : 1,
					}}
				>
					{loading ? "Guardando..." : "Registrar pedido"}
				</Button>
			</Box>
		</Paper>
	);
}
