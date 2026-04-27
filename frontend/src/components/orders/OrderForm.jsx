import { Box, Button, Paper, Typography } from "@mui/material";
import ClientAutocomplete from "./ClientAutocomplete";
import LotAutocomplete from "./LotAutocomplete";
import ProductAutocomplete from "./ProductAutocomplete";
import FormFieldLabel from "../common/FormFieldLabel";
import { APP_PALETTE } from "../../theme/palette";

export default function OrderForm({
	clients,
	lots,
	productNames,
	clientInput,
	selectedClient,
	clientPhone,
	form,
	loading,
	showRequiredLabels = false,
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
		border: `1px solid ${APP_PALETTE.surfaces.border}`,
		borderRadius: 6,
		fontSize: 14,
		boxSizing: "border-box",
	};

	const labelStyle = {
		display: "block",
		marginBottom: 4,
		fontWeight: 500,
		color: APP_PALETTE.text.secondary,
		fontSize: 13,
	};

	return (
		<Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
			<Typography variant="h6" fontWeight={600} color={APP_PALETTE.text.primary} mb={2.5}>
				Registrar nuevo pedido
			</Typography>

			<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2.5 }}>
				<div>
					<FormFieldLabel label="Cliente" required showRequired={showRequiredLabels} style={labelStyle}>
						{selectedClient && (
							<span
								style={{
									marginLeft: 8,
									background: APP_PALETTE.surfaces.successSoft,
									color: APP_PALETTE.status.success,
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
									background: APP_PALETTE.surfaces.warningSoft,
									color: APP_PALETTE.status.warning,
									borderRadius: 20,
									padding: "1px 8px",
									fontSize: 11,
									fontWeight: 600,
								}}
							>
								Se creara nuevo
							</span>
						)}
				</FormFieldLabel>

					<ClientAutocomplete
						clients={clients}
						value={clientInput}
						onChange={onClientInputChange}
						onSelect={onSelectClient}
					/>

					{!selectedClient && clientInput && (
						<div style={{ marginTop: 10 }}>
					<FormFieldLabel label="Celular del cliente" required showRequired={showRequiredLabels} style={labelStyle} />
							<input
								value={clientPhone}
								onChange={(e) => onClientPhoneChange(e.target.value)}
								style={inputStyle}
								placeholder="+591 7..."
							/>
								<Typography sx={{ mt: 0.5, fontSize: 12, color: APP_PALETTE.status.warning }}>
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
					<Typography fontWeight={600} color={APP_PALETTE.text.primary}>
					Productos
				</Typography>
				<Button
					size="small"
					variant="outlined"
					onClick={onAddItem}
						sx={{ color: APP_PALETTE.brand.primary, borderColor: APP_PALETTE.brand.primary, borderRadius: 2 }}
				>
					+ Agregar item
				</Button>
			</Box>

			<Box
				sx={{
					background: APP_PALETTE.surfaces.subtle,
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
								{i === 0 && <FormFieldLabel label="Descripcion del producto" required showRequired={showRequiredLabels} style={labelStyle} />}
								<ProductAutocomplete
									products={productNames}
									value={item.product_name}
									onChange={(val) => onUpdateItem(i, "product_name", val)}
									onSelect={(p) => onUpdateItem(i, "product_name", p.name)}
								/>
							</div>

							<div>
								{i === 0 && <FormFieldLabel label="Cantidad" required showRequired={showRequiredLabels} style={labelStyle} />}
								<input
									type="number"
									min="1"
									value={item.quantity}
									onChange={(e) => onUpdateItem(i, "quantity", e.target.value)}
									style={inputStyle}
								/>
							</div>

							<div>
								{i === 0 && <FormFieldLabel label="Precio (Bs.)" required showRequired={showRequiredLabels} style={labelStyle} />}
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
									background: form.items.length === 1 ? APP_PALETTE.surfaces.borderSoft : APP_PALETTE.surfaces.errorSoft,
									color: form.items.length === 1 ? APP_PALETTE.text.muted : APP_PALETTE.status.error,
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
						<FormFieldLabel label="Lote" required showRequired={showRequiredLabels} style={labelStyle} />
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
					borderTop: `1px solid ${APP_PALETTE.surfaces.borderSoft}`,
					pt: 2,
					mt: 2,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<Typography>
						<span style={{ color: APP_PALETTE.text.muted, fontSize: 13 }}>{form.items.length} item(s) - </span>
						<span style={{ fontWeight: 700, fontSize: 16, color: APP_PALETTE.text.primary }}>Total: Bs. {total.toFixed(2)}</span>
				</Typography>

				<Button
					variant="contained"
					onClick={onSubmit}
					disabled={loading || !clientInput || missingPhoneForNewClient || form.items.some((i) => !i.product_name || !i.unit_price || !i.lot_id)}
						sx={{
							background: APP_PALETTE.brand.primary,
							"&:hover": { background: APP_PALETTE.brand.primaryHover },
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
