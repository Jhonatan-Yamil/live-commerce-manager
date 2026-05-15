import os
import shutil
from typing import Callable

from fastapi import HTTPException, UploadFile


def save_uploaded_file(
    file: UploadFile,
    directory: str,
    allowed_extensions: set[str],
    filename_builder: Callable[[str], str],
    error_message: str,
) -> str:
    os.makedirs(directory, exist_ok=True)

    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=error_message)

    filename = filename_builder(extension)
    filepath = os.path.join(directory, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return filename