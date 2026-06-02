from io import BytesIO
import base64


def _fit_font_size(text, font_name, max_width, preferred_size, min_size=20):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    size = preferred_size
    while size >= min_size:
        if stringWidth(text, font_name, size) <= max_width:
            return size
        size -= 2
    return min_size


def _draw_wrapped_centered(c, text, font_name, font_size, center_x, top_y, max_width):
    from reportlab.pdfbase.pdfmetrics import stringWidth

    words = text.split()
    lines = []
    current = ""

    for word in words:
        test = f"{current} {word}".strip()
        if stringWidth(test, font_name, font_size) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)

    line_h = font_size * 1.2
    c.setFont(font_name, font_size)
    y = top_y - font_size

    for line in lines:
        c.drawCentredString(center_x, y, line)
        y -= line_h

    return y


def generate_remito_pdf(
    order,
    delivery_schedule,
    orientation="landscape",
    paper_size="a4",
    logo_base64: str | None = None, 
):
    from reportlab.lib.pagesizes import A4, letter, legal, landscape as rl_landscape
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    size_map = {"a4": A4, "letter": letter, "legal": legal, "auto": A4}
    base_size = size_map.get(paper_size, A4)
    page_size = rl_landscape(base_size) if orientation == "landscape" else base_size
    page_width, page_height = page_size

    pdf_file = BytesIO()
    c = canvas.Canvas(pdf_file, pagesize=page_size)

    margin = 16 * mm
    padding = 16 * mm
    max_text_width = page_width - 2 * margin - 2 * padding

    inner_x = margin
    inner_y = margin
    inner_w = page_width - 2 * margin
    inner_h = page_height - 2 * margin

    c.setLineWidth(2)
    c.setStrokeColorRGB(0.067, 0.067, 0.067)
    c.rect(inner_x, inner_y, inner_w, inner_h)

    if logo_base64:
        try:
            if "," in logo_base64:
                header, data = logo_base64.split(",", 1)
            else:
                header, data = "", logo_base64

            img_bytes = base64.b64decode(data)

            if "svg" in header.lower() or img_bytes[:4] == b"<svg" or img_bytes[:5] == b"<?xml":
                pass
            else:
                from PIL import Image as PILImage
                img_buf = BytesIO(img_bytes)
                pil_img = PILImage.open(img_buf)
                pil_img.load()

                logo_max_w = 42 * mm
                logo_max_h = 22 * mm
                orig_w, orig_h = pil_img.size   # píxeles
                scale = min(logo_max_w / orig_w, logo_max_h / orig_h)
                logo_w = orig_w * scale
                logo_h = orig_h * scale

                logo_x = inner_x + inner_w - logo_w - 8 * mm
                logo_y = inner_y + inner_h - logo_h - 8 * mm

                img_buf.seek(0)
                from reportlab.lib.utils import ImageReader
                c.drawImage(
                    ImageReader(img_buf),
                    logo_x, logo_y,
                    width=logo_w, height=logo_h,
                    mask="auto",
                    preserveAspectRatio=True,
                )
        except Exception:
            pass  

    client_name = (order.client.full_name if order.client else None) or "Sin cliente"
    phone = (order.client.phone if order.client else None) or "-"
    location = str(
        getattr(delivery_schedule, "location", None)
        or getattr(delivery_schedule, "destination_city", None)
        or getattr(delivery_schedule, "delivery_location", None)
        or "Sin destino"
    )

    font = "Helvetica-Bold"
    gap = 12 * mm
    center_x = page_width / 2

    size_name  = _fit_font_size(client_name, font, max_text_width, preferred_size=64)
    size_phone = _fit_font_size(phone,        font, max_text_width, preferred_size=52)
    size_city  = _fit_font_size(location,     font, max_text_width, preferred_size=44)

    def block_height(text, font_name, font_size, max_w):
        from reportlab.pdfbase.pdfmetrics import stringWidth
        words = text.split()
        lines = []
        current = ""
        for word in words:
            test = f"{current} {word}".strip()
            if stringWidth(test, font_name, font_size) <= max_w:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return len(lines) * font_size * 1.2

    h_name  = block_height(client_name, font, size_name,  max_text_width)
    h_phone = block_height(phone,        font, size_phone, max_text_width)
    h_city  = block_height(location,     font, size_city,  max_text_width)
    total_h = h_name + h_phone + h_city + 2 * gap

    center_y = inner_y + inner_h / 2
    start_y  = center_y + total_h / 2

    c.setFillColorRGB(0, 0, 0)

    y = _draw_wrapped_centered(c, client_name, font, size_name,  center_x, start_y, max_text_width)
    y -= gap
    y = _draw_wrapped_centered(c, phone,        font, size_phone, center_x, y,       max_text_width)
    y -= gap
    _draw_wrapped_centered(c, location,     font, size_city,  center_x, y,       max_text_width)

    c.save()
    pdf_file.seek(0)
    return pdf_file.getvalue()