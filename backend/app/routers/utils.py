from fastapi import HTTPException


def require_found(resource, detail: str):
    if not resource:
        raise HTTPException(status_code=404, detail=detail)
    return resource


def value_error_to_http_400(error: ValueError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(error))