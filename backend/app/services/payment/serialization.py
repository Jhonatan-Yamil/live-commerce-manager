from app.schemas.payment import PaymentOut
from app.repositories import payment_repository


def list_payments(db):
    rows = payment_repository.list_with_context(db)
    result = []

    for payment, order, client in rows:
        result.append(
            PaymentOut(
                id=payment.id,
                order_id=payment.order_id,
                status=payment.status,
                voucher_path=payment.voucher_path,
                notes=payment.notes,
                reviewed_at=payment.reviewed_at,
                created_at=payment.created_at,
                client_name=client.full_name if client else None,
                order_created_at=order.created_at if order else None,
                order_total=float(order.total) if order else None,
            )
        )

    return result