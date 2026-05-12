import { useRef, useState } from "react";
import { Box, Button, Dialog, DialogContent, MenuItem, TextField } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import { extractPrintableCity } from "../../utils/logistics";
import { getBackendOrigin } from "../../services/api";

const PAPER_SIZES = {
  auto: { label: "Automático (impresora)" },
  a4: { label: "A4", mm: [210, 297], css: "A4" },
  letter: { label: "Carta", mm: [216, 279], css: "letter" },
  legal: { label: "Legal", mm: [216, 356], css: "legal" },
};

const getPaperRatio = (paperSize, orientation) => {
  const size = PAPER_SIZES[paperSize] || PAPER_SIZES.a4;
  const mm = size.mm || PAPER_SIZES.a4.mm;
  const [w, h] = orientation === "portrait" ? mm : [mm[1], mm[0]];
  return `${w} / ${h}`;
};

const buildPrintHtml = ({ clientName, phone, city, brandLogoUrl, paperSize, orientation }) => {
  const sizeDef = PAPER_SIZES[paperSize] || PAPER_SIZES.auto;
  const pageSize = sizeDef.css ? `${sizeDef.css} ${orientation}` : "auto";
  const logoHtml = brandLogoUrl
    ? `<img src="${brandLogoUrl}" alt="Logo" class="logo" crossorigin="anonymous" />`
    : "";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Remito</title>
    <style>
      @page {
        size: ${pageSize};
        margin: 16mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        background: #fff;
        width: 100%;
        height: 100%;
      }
      .sheet {
        width: 100%;
        min-height: calc(100vh - 32mm);
        border: 2px solid #111;
        box-sizing: border-box;
        padding: 18mm 16mm 16mm;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        gap: 10mm;
      }
      .logo {
        position: absolute;
        top: 8mm;
        right: 8mm;
        max-width: 42mm;
        max-height: 22mm;
        object-fit: contain;
      }
      .name {
        font-size: clamp(38px, 8.5vw, 78px);
        font-weight: 900;
        line-height: 1.05;
      }
      .phone {
        font-size: clamp(34px, 7.5vw, 68px);
        font-weight: 800;
        line-height: 1.05;
      }
      .city {
        font-size: clamp(30px, 7vw, 64px);
        font-weight: 800;
        line-height: 1.05;
      }
      @media print {
        .sheet {
          width: 100%;
          height: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      ${logoHtml}
      <div class="name">${clientName || "Sin cliente"}</div>
      <div class="phone">${phone || "-"}</div>
      <div class="city">${city || "Sin destino"}</div>
    </div>
  </body>
</html>
`.trim();
};

export default function DeliverySlip({ open, onClose, delivery, order, client, brandLogoUrl }) {
  const slipRef = useRef();
  const [paperSize, setPaperSize] = useState("auto");
  const [orientation, setOrientation] = useState("landscape");
  const [downloading, setDownloading] = useState(false);

  const safeClientName = client?.full_name || "";
  const safePhone = client?.phone || "";
  const locationForPrint = extractPrintableCity(delivery);

  const printableHtml = buildPrintHtml({
    clientName: safeClientName,
    phone: safePhone,
    city: locationForPrint,
    brandLogoUrl,
    paperSize,
    orientation,
  });

  if (!delivery || !order || !client) return null;

  const handlePrint = () => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.visibility = "hidden";
    document.body.appendChild(frame);

    const cleanup = () => {
      setTimeout(() => {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }, 0);
    };

    frame.onload = () => {
      const frameWindow = frame.contentWindow;
      if (!frameWindow) { cleanup(); return; }
      frameWindow.document.open();
      frameWindow.document.write(printableHtml);
      frameWindow.document.close();
      frameWindow.onafterprint = cleanup;
      setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
      }, 50);
    };

    frame.srcdoc = printableHtml;
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const backendUrl = getBackendOrigin();
      const psParam = paperSize === "auto" ? "a4" : paperSize;

      const response = await fetch(
        `${backendUrl}/api/logistics/delivery/${delivery.id}/remito.pdf?orientation=${orientation}&paper_size=${psParam}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("Error servidor:", response.status, text);
        alert(`Error ${response.status}: ${text}`);
        throw new Error("Error descargando PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remito-${order.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando PDF:", error);
      alert("Error al descargar el remito PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mb: 1.5 }}>
          <TextField
            select
            size="small"
            label="Tamaño hoja"
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
          >
            {Object.entries(PAPER_SIZES).map(([key, item]) => (
              <MenuItem key={key} value={key}>{item.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Orientación"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
          >
            <MenuItem value="landscape">Horizontal</MenuItem>
            <MenuItem value="portrait">Vertical</MenuItem>
          </TextField>
        </Box>

        <Box
          ref={slipRef}
          sx={{
            width: "100%",
            aspectRatio: getPaperRatio(paperSize, orientation),
            minHeight: { xs: 360, md: 540 },
            p: 5,
            bgcolor: "white",
            border: "3px solid #111",
            borderRadius: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            gap: 3,
          }}
        >
          {brandLogoUrl ? (
            <Box
              component="img"
              src={brandLogoUrl}
              alt="Logo de la tienda"
              crossOrigin="anonymous"
              sx={{
                position: "absolute",
                top: 18,
                right: 18,
                maxHeight: 84,
                maxWidth: 190,
                objectFit: "contain",
              }}
            />
          ) : null}

          <Box sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            width: "100%",
          }}>
            <Box sx={{ fontSize: { xs: "50px", md: "76px" }, fontWeight: 900, color: "#000", lineHeight: 1.04 }}>
              {client.full_name || "Sin cliente"}
            </Box>
            <Box sx={{ fontSize: { xs: "40px", md: "64px" }, fontWeight: 800, color: "#000", lineHeight: 1.04 }}>
              {client.phone || "-"}
            </Box>
            <Box sx={{ fontSize: { xs: "38px", md: "60px" }, fontWeight: 800, color: "#000", lineHeight: 1.04 }}>
              {locationForPrint || "Sin destino"}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            Imprimir
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? "Descargando..." : "Descargar PDF"}
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Cerrar
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}