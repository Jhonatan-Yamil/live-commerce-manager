import { useRef, useState } from "react";
import { Box, Button, Dialog, DialogContent, MenuItem, TextField } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";

const extractCity = (deliveryLocation) => {
  const rawLocation = String(deliveryLocation || "").trim();
  if (!rawLocation) return "";

  if (rawLocation.toLowerCase().startsWith("otra ciudad/departamento")) {
    const parts = rawLocation
      .split(" - ")
      .map((part) => part.trim())
      .filter(Boolean);
    const cityPart = parts.find(
      (part, index) => index > 0 && !part.toLowerCase().startsWith("transporte:")
    );
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

const normalizeDisplayLocation = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.toLowerCase().startsWith("otra ciudad/departamento")) {
    return raw;
  }

  const parts = raw
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length <= 1) return raw;
  const first = parts[0].toLowerCase();
  const allEqual = parts.every((item) => item.toLowerCase() === first);
  return allEqual ? parts[0] : raw;
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

  const safeClientName = client?.full_name || "";
  const safePhone = client?.phone || "";
  
  // Usar directamente location o destination_city según lo que esté disponible
  const city = delivery?.location || delivery?.destination_city || extractCity(delivery?.delivery_location || "");
  const locationForPrint = normalizeDisplayLocation(city);
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
      if (!frameWindow) {
        cleanup();
        return;
      }
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

  const handleDownloadPDF = () => {
    const opt = {
      margin: 0,
      filename: `remito-${order.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        windowWidth: 1280,
        windowHeight: 960,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: {
        orientation,
        unit: "mm",
        format: (PAPER_SIZES[paperSize]?.mm || PAPER_SIZES.a4.mm),
      },
    };

    const ensureHtml2Pdf = () => {
      return new Promise((resolve) => {
        if (window.html2pdf) return resolve(window.html2pdf);
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve(window.html2pdf);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });
    };

    const waitImagesLoaded = (root, timeout = 3000) =>
      new Promise((resolve) => {
        try {
          const imgs = Array.from(root?.images || root?.querySelectorAll?.("img") || []);
          if (imgs.length === 0) return resolve(true);
          let loaded = 0;
          const onDone = () => {
            loaded += 1;
            if (loaded >= imgs.length) resolve(true);
          };
          imgs.forEach((img) => {
            if (img.complete) return onDone();
            img.addEventListener("load", onDone);
            img.addEventListener("error", onDone);
          });
          // safety timeout
          setTimeout(() => resolve(true), timeout);
        } catch (e) {
          resolve(true);
        }
      });

    (async () => {
      const html2pdfLib = await ensureHtml2Pdf();
      if (!html2pdfLib) return;

      const source = slipRef.current;
      if (!source) return;

      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {
          // ignore
        }
      }

      await waitImagesLoaded(document);

      const rect = source.getBoundingClientRect();

      const exportWrap = document.createElement("div");
      exportWrap.style.position = "fixed";
      exportWrap.style.left = "0";
      exportWrap.style.top = "0";
      exportWrap.style.background = "#ffffff";
      exportWrap.style.zIndex = "-1";
      exportWrap.style.pointerEvents = "none";
      exportWrap.style.padding = "0";
      exportWrap.style.margin = "0";
      exportWrap.style.width = `${Math.ceil(rect.width)}px`;
      exportWrap.style.height = `${Math.ceil(rect.height)}px`;
      exportWrap.style.overflow = "visible";
      exportWrap.style.display = "flex";
      exportWrap.style.justifyContent = "center";
      exportWrap.style.alignItems = "flex-start";

      const clone = source.cloneNode(true);
      clone.style.width = "100%";
      clone.style.maxWidth = "none";
      clone.style.height = "100%";
      clone.style.minHeight = `${Math.ceil(rect.height)}px`;
      clone.style.boxSizing = "border-box";
      clone.style.margin = "0";
      clone.style.transform = "none";
      clone.style.overflow = "visible";
      exportWrap.appendChild(clone);
      document.body.appendChild(exportWrap);

      await waitImagesLoaded(exportWrap);

      const cleanup = () => {
        setTimeout(() => {
          if (exportWrap.parentNode) exportWrap.parentNode.removeChild(exportWrap);
        }, 50);
      };

      requestAnimationFrame(() => {
        // eslint-disable-next-line no-undef
        html2pdf().set(opt).from(clone).save().then(cleanup).catch(cleanup);
      });
    })();
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
              <MenuItem key={key} value={key}>
                {item.label}
              </MenuItem>
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
            "@media print": {
              border: "none",
              height: "auto",
              minHeight: "auto",
              p: 2,
            },
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

          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", width: "100%" }}>
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
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadPDF}>
            Exportar PDF
          </Button>
          <Button variant="contained" onClick={onClose}>
            Cerrar
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
