import { useEffect, useRef, useState } from "react";

export default function LotAutocomplete({ lots, value, onChange, onSelect, onClear }) {
	const [open, setOpen] = useState(false);
	const [highlighted, setHighlighted] = useState(0);
	const ref = useRef(null);

	const filtered = lots.filter(
		(l) => l.name.toLowerCase().includes(value.toLowerCase()) || l.brand.toLowerCase().includes(value.toLowerCase())
	);

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
			if (filtered[highlighted]) {
				onSelect(filtered[highlighted]);
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
				placeholder="Ej: Lote A - Ropa de invierno"
				style={{
					width: "100%",
					padding: "8px 10px",
					border: "1px solid #ddd",
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
						background: "#fff",
						border: "1px solid #ddd",
						borderRadius: 8,
						boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
						zIndex: 100,
						maxHeight: 180,
						overflowY: "auto",
					}}
				>
					{filtered.length > 0 ? (
						filtered.map((l, i) => (
							<div
								key={l.id}
								onMouseDown={() => {
									onSelect(l);
									setOpen(false);
								}}
								style={{
									padding: "10px 14px",
									cursor: "pointer",
									fontSize: 14,
									borderBottom: "1px solid #f5f5f5",
									background: i === highlighted ? "#f0f4ff" : "#fff",
								}}
								onMouseEnter={() => setHighlighted(i)}
							>
								<span style={{ fontWeight: 600 }}>{l.name}</span>
								<span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{l.brand}</span>
								<span style={{ color: "#aaa", fontSize: 11, marginLeft: 8 }}>{l.units_remaining} uds restantes</span>
							</div>
						))
					) : (
						<div style={{ padding: "10px 14px", color: "#aaa", fontSize: 13 }}>No se encontro ningun lote</div>
					)}
				</div>
			)}
		</div>
	);
}
