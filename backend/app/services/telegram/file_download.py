from tempfile import SpooledTemporaryFile

from fastapi import UploadFile

from .http_client import telegram_api_get, download_telegram_file


def build_upload_from_telegram_file(file_id: str, filename: str, mime_type: str | None = None) -> UploadFile:
    file_meta = telegram_api_get("getFile", {"file_id": file_id})
    file_path = file_meta.get("file_path")
    if not file_path:
        raise ValueError("Telegram no devolvió file_path")

    content = download_telegram_file(file_path)

    spooled = SpooledTemporaryFile(max_size=10 * 1024 * 1024)
    spooled.write(content)
    spooled.seek(0)

    return UploadFile(filename=filename, file=spooled)