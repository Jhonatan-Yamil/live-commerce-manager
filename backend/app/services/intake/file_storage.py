import hashlib
import os


UPLOAD_DIR = "uploads/intake"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
}


os.makedirs(UPLOAD_DIR, exist_ok=True)


def validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Solo se permiten archivos JPG, PNG o PDF")
    return ext


def validate_mime_type(mime_type: str | None) -> None:
    if not mime_type:
        return
    if mime_type.lower() not in ALLOWED_MIME_TYPES:
        raise ValueError("Tipo de archivo no permitido")


def read_upload_bytes(file) -> bytes:
    content = file.file.read()
    file.file.seek(0)
    return content


def validate_file_size(content: bytes, max_megabytes: int) -> None:
    max_bytes = max_megabytes * 1024 * 1024
    if len(content) > max_bytes:
        raise ValueError(f"Archivo demasiado grande. Máximo {max_megabytes}MB")


def compute_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def save_uploaded_file(filename: str, content: bytes) -> str:
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    return filepath