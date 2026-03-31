from app.repositories import product_repository


def create_product(db, payload: dict):
    return product_repository.create_product(db, payload)


def list_products(db):
    return product_repository.list_active_products(db)


def list_product_names(db):
    return product_repository.list_product_names(db)


def get_product(db, product_id: int):
    return product_repository.get_product_by_id(db, product_id)


def update_product(db, product_id: int, payload: dict):
    return product_repository.update_product(db, product_id, payload)


def list_sold_products(db):
    rows = product_repository.list_sales_rows(db)
    product_map = {}

    for item, product, lot in rows:
        key = product.id
        if key not in product_map:
            product_map[key] = {
                "product_id": product.id,
                "name": product.name,
                "units_sold": 0,
                "total_revenue": 0,
                "orders_count": set(),
                "lots": {},
            }

        product_map[key]["units_sold"] += item.quantity
        product_map[key]["total_revenue"] += float(item.subtotal)
        product_map[key]["orders_count"].add(item.order_id)

        if lot:
            lot_key = lot.id
            if lot_key not in product_map[key]["lots"]:
                product_map[key]["lots"][lot_key] = {
                    "lot_id": lot.id,
                    "lot_name": lot.name,
                    "brand": lot.brand,
                    "units_sold": 0,
                    "revenue": 0,
                }

            product_map[key]["lots"][lot_key]["units_sold"] += item.quantity
            product_map[key]["lots"][lot_key]["revenue"] += float(item.subtotal)

    result = []
    for product_data in product_map.values():
        units = product_data["units_sold"]
        revenue = product_data["total_revenue"]
        result.append(
            {
                "product_id": product_data["product_id"],
                "name": product_data["name"],
                "units_sold": units,
                "total_revenue": round(revenue, 2),
                "orders_count": len(product_data["orders_count"]),
                "avg_price": round(revenue / units, 2) if units > 0 else 0,
                "lots": list(product_data["lots"].values()),
            }
        )

    result.sort(key=lambda x: x["total_revenue"], reverse=True)
    return result
