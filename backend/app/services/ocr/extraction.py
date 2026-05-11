import os
from io import BytesIO

try:
    import pdfplumber
except Exception:
    pdfplumber = None

try:
    import fitz
except Exception:
    fitz = None

try:
    from PIL import Image
except Exception:
    Image = None

try:
    import pytesseract
except Exception:
    pytesseract = None


def extract_text_from_pdf(file_path: str) -> str:
    text_chunks = []

    if pdfplumber:
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    if page_text:
                        text_chunks.append(page_text)
        except Exception:
            pass

    if not text_chunks and fitz and Image and pytesseract:
        try:
            doc = fitz.open(file_path)
            for page in doc:
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_data = pix.tobytes("ppm")
                image = Image.open(BytesIO(img_data))
                ocr_text = pytesseract.image_to_string(image, lang="spa+eng")
                if ocr_text.strip():
                    text_chunks.append(ocr_text)
            doc.close()
        except Exception:
            pass

    return "\n".join(text_chunks)


def extract_text_from_image(file_path: str) -> str:
    if not (Image and pytesseract):
        return ""
    image = Image.open(file_path)
    try:
        return pytesseract.image_to_string(image, lang="spa+eng")
    except Exception:
        try:
            return pytesseract.image_to_string(image)
        except Exception:
            return ""


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    return extract_text_from_image(file_path)