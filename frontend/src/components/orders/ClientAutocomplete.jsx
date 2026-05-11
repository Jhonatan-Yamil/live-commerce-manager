import { useEffect, useRef, useState } from "react";
import { APP_PALETTE } from "../../theme/palette";

export default function ClientAutocomplete({ clients, value, onChange, onSelect }) {
	const [open, setOpen] = useState(false);
	const [highlighted, setHighlighted] = useState(0);
	const ref = useRef(null);

	const filtered = clients.filter((c) => c.full_name.toLowerCase().includes(value.toLowerCase()));
	const exactMatch = clients.find((c) => c.full_name.toLowerCase() === value.toLowerCase());

	useEffect(() => {
		const handleClick = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};

		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	useEffect(() => {
		setHighlighted(0);
	}, [value]);

	const handleKeyDown = (e) => {
		if (!open || filtered.length === 0) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlighted((h) => Math.max(h - 1, 0));
			return;
		}

		if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			const selected = filtered[highlighted] || exactMatch;
			if (selected) {
				onSelect(selected);
				setOpen(false);
			}
			return;
		}

		if (e.key === "Escape") {
			setOpen(false);
		}
	};

	return (
		<div ref={ref} style={{ position: "relative" }}>
			<input
				value={value}
				onChange={(e) => {
					onChange(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onKeyDown={handleKeyDown}
				placeholder="Escribir nombre del cliente..."
				style={{
					width: "100%",
					padding: "8px 10px",
					border: `1px solid ${APP_PALETTE.surfaces.border}`,
					borderRadius: 6,
					fontSize: 14,
					boxSizing: "border-box",
				}}
			/>

			{open && value.length > 0 && (
				<div
					style={{
						position: "absolute",
						top: "100%",
						left: 0,
						right: 0,
						background: APP_PALETTE.surface,
						border: `1px solid ${APP_PALETTE.surfaces.border}`,
						borderRadius: 8,
						boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
						zIndex: 100,
						maxHeight: 200,
						overflowY: "auto",
					}}
				>
					{filtered.length > 0 ? (
						filtered.map((c, i) => ( 
							<div
								key={c.id}
								onMouseDown={() => {
									onSelect(c);
									setOpen(false);
								}}
								style={{
									padding: "10px 14px",
									cursor: "pointer",
									fontSize: 14,
									borderBottom: `1px solid ${APP_PALETTE.surfaces.borderSoft}`,
 									background: i === highlighted ? APP_PALETTE.brand.soft : APP_PALETTE.surface,
								}}
								onMouseEnter={() => setHighlighted(i)}
							>
								<span style={{ fontWeight: 600 }}>{c.full_name}</span>
								{c.phone && <span style={{ color: APP_PALETTE.text.muted, fontSize: 12, marginLeft: 8 }}>{c.phone}</span>}
							</div>
						))
					) : (
						<div style={{ padding: "10px 14px", color: APP_PALETTE.text.muted, fontSize: 13 }}>
							No encontrado - se creara <strong>"{value}"</strong> como nuevo cliente
						</div>
					)}
				</div>
			)}
		</div>
	);
}
