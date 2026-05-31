import sys
import io
import os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import timezone

import app.models
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.client import Client
from app.models.product import Product
from app.models.lot import Lot
from app.models.order import Order, OrderItem, OrderStatus
from app.models.delivery_schedule import DeliverySchedule, DeliveryScheduleStatus
from app.models.payment import Payment, PaymentStatus
from app.models.logistics import Logistics, DeliveryStatus, DeliveryType
from app.core.config import settings

def simple_hash_password(password: str) -> str:
    from app.core.security import get_password_hash
    return get_password_hash(password)

def clear_database(engine):
    print("🧹 Limpiando base de datos...")

    tables_to_truncate = [
        "delivery_schedules",
        "voucher_intakes",
        "order_items",
        "payments",
        "logistics",
        "orders",
        "lots",
        "products",
        "clients",
        "users",
    ]

    with engine.begin() as connection:
        connection.execute(text(f'TRUNCATE TABLE {", ".join(tables_to_truncate)} RESTART IDENTITY CASCADE'))
        print("  ✓ Tablas limpiadas con TRUNCATE ... CASCADE")
        print("  ✓ Identidades reiniciadas\n")

def seed_database(engine):
    print("\n📊 Poblando base de datos con datos de ejemplo...\n")
    
    session = Session(engine)
    
    try:
        print("👤 Insertando usuarios...")
        users = [
            User(
                full_name="Carlos Morales",
                email="admin@livesale.bo",
                hashed_password=simple_hash_password("admin123"),
                role=UserRole.admin,
                is_active=True
                ,logo_path="/uploads/store_logos/demo-store.svg"
            ),
            User(
                full_name="Maria Fernández",
                email="maria@livesale.bo",
                hashed_password=simple_hash_password("seller123"),
                role=UserRole.seller,
                is_active=True
                ,logo_path="/uploads/store_logos/demo-store.svg"
            ),
            User(
                full_name="Juan Quispe",
                email="juan@livesale.bo",
                hashed_password=simple_hash_password("seller123"),
                role=UserRole.seller,
                is_active=True
                ,logo_path="/uploads/store_logos/demo-store.svg"
            ),
            User(
                full_name="Luis Ramírez",
                email="luis@livesale.bo",
                hashed_password=simple_hash_password("seller123"),
                role=UserRole.seller,
                is_active=True
                ,logo_path="/uploads/store_logos/demo-store.svg"
            ),
        ]
        session.add_all(users)
        session.commit()
        print(f"  ✓ {len(users)} usuarios creados\n")
        # Capture created user ids for tenant assignment
        admin_id = users[0].id
        maria_id = users[1].id
        juan_id = users[2].id
        luis_id = users[3].id
        
        print("🏪 Insertando clientes...")
        # Assign most clients to admin (user 1), keep last two for Maria (user 2)
        clients = [
            Client(
                full_name="Tienda Los Andes",
                phone="71234567",
                address="Ceibo S/N, La Paz",
                delivery_city="La Paz",
                delivery_department="La Paz",
                notes="Cliente VIP, múltiples pedidos frecuentes",
                user_id=admin_id,
            ),
            Client(
                full_name="Boutique Elegancia",
                phone="72456789",
                address="Avenida Ballivián 500, Cochabamba",
                delivery_city="Cochabamba",
                delivery_department="Cochabamba",
                notes="Compras semanales, requiere entregas rápidas",
                user_id=admin_id,
            ),
            Client(
                full_name="Centro Comercial Santa Cruz",
                phone="73567890",
                address="Av. Cristo Redentor, Santa Cruz",
                delivery_city="Santa Cruz",
                delivery_department="Santa Cruz",
                notes="Distribuidor mayorista, grandes volúmenes",
                user_id=admin_id,
            ),
            Client(
                full_name="Joyería Boliviana Premium",
                phone="76123456",
                address="Plaza Arce, Sucre",
                delivery_city="Sucre",
                delivery_department="Chuquisaca",
                notes="Especialidad en accesorios, pago contado",
                user_id=admin_id,
            ),
            Client(
                full_name="Supermercado Mi Bolivia",
                phone="74987654",
                address="Av. Las Américas, Tarija",
                delivery_city="Tarija",
                delivery_department="Tarija",
                notes="Venta retail, variedad de productos",
                user_id=admin_id,
            ),
            Client(
                full_name="Ropería El Paso",
                phone="77654321",
                address="Av. Montes 1234, La Paz",
                delivery_city="La Paz",
                delivery_department="La Paz",
                notes="Múltiples entregas por mes",
                user_id=admin_id,
            ),
            Client(
                full_name="Accesorios y Bisutería YB",
                phone="78765432",
                address="Calle Potosí 567, Oruro",
                delivery_city="Oruro",
                delivery_department="Oruro",
                notes="Minorista, entregas semanales",
                user_id=maria_id,
            ),
            Client(
                full_name="Farmacia San Miguel",
                phone="79876543",
                address="Av. Pando 890, Cochabamba",
                delivery_city="Cochabamba",
                delivery_department="Cochabamba",
                notes="Venta de cosméticos y productos de belleza",
                user_id=maria_id,
            ),
        ]
        session.add_all(clients)
        session.commit()
        print(f"  ✓ {len(clients)} clientes creados\n")
        
        print("📦 Insertando productos...")
        # Products: mostly admin, a couple for Maria
        products = [
            Product(
                name="Polo Clásico 100% Algodón",
                description="Polo clásico en varios colores, algodón puro, tallas S-XXXL",
                price=Decimal("85.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Jeans Premium Stretch",
                description="Jeans de alta calidad con stretch, confortables",
                price=Decimal("180.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Crema Facial Nutritiva 50ml",
                description="Crema hidratante profesional, regeneradora",
                price=Decimal("120.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Set de Joyas Doradas",
                description="Collar, pulsera y aretes en acero dorado, joyería fina",
                price=Decimal("250.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Lápiz Labial Duradero 24h",
                description="Labial tintón 24 horas, varios tonos, fórmula waterproof",
                price=Decimal("75.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Muñeca Juguete Educativo",
                description="Muñeca con accesorios, atuendos intercambiables, educativa",
                price=Decimal("95.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Blusa Elegante Seda",
                description="Blusa de seda natural, elegante para ocasiones especiales",
                price=Decimal("165.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Cinturón de Cuero Genuino",
                description="Cinturón de cuero genuino, ajustable, múltiples colores",
                price=Decimal("95.00"),
                stock=1,
                is_active=True,
                user_id=admin_id,
            ),
            Product(
                name="Bolsa de Mano Premium",
                description="Bolsa elegante, material PU, compartimentos múltiples",
                price=Decimal("220.00"),
                stock=1,
                is_active=True,
                user_id=maria_id,
            ),
            Product(
                name="Perfume Eau de Toilette 100ml",
                description="Fragancia floral, larga duración, importado",
                price=Decimal("180.00"),
                stock=1,
                is_active=True,
                user_id=maria_id,
            ),
        ]
        session.add_all(products)
        session.commit()
        print(f"  ✓ {len(products)} productos creados\n")
        
        print("📍 Insertando lotes...")
        # Lots: majority for admin, last one for Maria
        lots = [
            Lot(
                name="Lote A - Importación Ropa Casual LEFTIES",
                brand="Confecciones Europeas S.A.",
                total_units=500,
                total_cost=Decimal("10000.00"),
                unit_cost=Decimal("20.00"),
                notes="Ropa importada de Chile, calidad premium",
                user_id=admin_id,
            ),
            Lot(
                name="Lote B - Bisutería La Paz Premium",
                brand="Joyas Bolivia Ltd.",
                total_units=300,
                total_cost=Decimal("12000.00"),
                unit_cost=Decimal("40.00"),
                notes="Accesorios y bisutería de calidad, oro y plata",
                user_id=admin_id,
            ),
            Lot(
                name="Lote C - Cosméticos y Belleza",
                brand="Productos Naturales Andinos",
                total_units=200,
                total_cost=Decimal("6000.00"),
                unit_cost=Decimal("30.00"),
                notes="Cremas, maquillaje y productos de belleza naturales",
                user_id=admin_id,
            ),
            Lot(
                name="Lote D - Bolsas y Accesorios",
                brand="Accesorios Fashion Bolivia",
                total_units=150,
                total_cost=Decimal("4500.00"),
                unit_cost=Decimal("30.00"),
                notes="Bolsas, cinturones, accesorios de moda",
                user_id=admin_id,
            ),
            Lot(
                name="Lote E - Perfumes Importados",
                brand="Fragancias Internacionales",
                total_units=100,
                total_cost=Decimal("8000.00"),
                unit_cost=Decimal("80.00"),
                notes="Perfumes premium, fragancia de larga duración",
                user_id=maria_id,
            ),
        ]
        session.add_all(lots)
        session.commit()
        print(f"  ✓ {len(lots)} lotes creados\n")
        
        print("📋 Insertando órdenes y items...")
        orders = []
        items_count = 0
        
        # Orders: set user_id based on owning client (clients 1-6 -> admin, 7-8 -> maria)
        def owner_for_client(client_id):
            if client_id in {1,2,3,4,5,6}:
                return admin_id
            return maria_id

        order1 = Order(
            client_id=1,
            status=OrderStatus.payment_confirmed,
            total=Decimal("1100.00"),
            notes="Cliente VIP - PAGADA, SIN LOGÍSTICA CREADA",
            user_id=owner_for_client(1),
        )
        orders.append(order1)
        session.add(order1)
        session.flush()
        items1 = [
            OrderItem(order_id=order1.id, product_id=1, lot_id=1, quantity=10, unit_price=Decimal("85.00"), subtotal=Decimal("850.00")),
            OrderItem(order_id=order1.id, product_id=4, lot_id=2, quantity=1, unit_price=Decimal("250.00"), subtotal=Decimal("250.00")),
        ]
        session.add_all(items1)
        items_count += len(items1)
        
        order2 = Order(
            client_id=2,
            status=OrderStatus.payment_confirmed,
            total=Decimal("2250.00"),
            notes="Entrega completada hace 3 días",
            user_id=owner_for_client(2),
        )
        orders.append(order2)
        session.add(order2)
        session.flush()
        items2 = [
            OrderItem(order_id=order2.id, product_id=2, lot_id=1, quantity=10, unit_price=Decimal("180.00"), subtotal=Decimal("1800.00")),
            OrderItem(order_id=order2.id, product_id=5, lot_id=3, quantity=6, unit_price=Decimal("75.00"), subtotal=Decimal("450.00")),
        ]
        session.add_all(items2)
        items_count += len(items2)
        
        order3 = Order(
            client_id=3,
            status=OrderStatus.pending_payment,
            total=Decimal("1725.00"),
            notes="PAGO PENDIENTE - No debe aparecer en logística",
            user_id=owner_for_client(3),
        )
        orders.append(order3)
        session.add(order3)
        session.flush()
        items3 = [
            OrderItem(order_id=order3.id, product_id=3, lot_id=3, quantity=12, unit_price=Decimal("120.00"), subtotal=Decimal("1440.00")),
            OrderItem(order_id=order3.id, product_id=6, lot_id=1, quantity=3, unit_price=Decimal("95.00"), subtotal=Decimal("285.00")),
        ]
        session.add_all(items3)
        items_count += len(items3)
        
        order4 = Order(
            client_id=4,
            status=OrderStatus.payment_confirmed,
            total=Decimal("1375.00"),
            notes="Destino: Sucre - PAGADA, SIN LOGÍSTICA",
            user_id=owner_for_client(4),
        )
        orders.append(order4)
        session.add(order4)
        session.flush()
        items4 = [
            OrderItem(order_id=order4.id, product_id=4, lot_id=2, quantity=4, unit_price=Decimal("250.00"), subtotal=Decimal("1000.00")),
            OrderItem(order_id=order4.id, product_id=5, lot_id=3, quantity=5, unit_price=Decimal("75.00"), subtotal=Decimal("375.00")),
        ]
        session.add_all(items4)
        items_count += len(items4)
        
        order5 = Order(
            client_id=5,
            status=OrderStatus.payment_confirmed,
            total=Decimal("460.00"),
            notes="Tarija - PAGADA, SIN LOGÍSTICA",
            user_id=owner_for_client(5),
        )
        orders.append(order5)
        session.add(order5)
        session.flush()
        items5 = [
            OrderItem(order_id=order5.id, product_id=5, lot_id=3, quantity=5, unit_price=Decimal("75.00"), subtotal=Decimal("375.00")),
            OrderItem(order_id=order5.id, product_id=1, lot_id=1, quantity=1, unit_price=Decimal("85.00"), subtotal=Decimal("85.00")),
        ]
        session.add_all(items5)
        items_count += len(items5)
        
        order6 = Order(
            client_id=1,
            status=OrderStatus.payment_confirmed,
            total=Decimal("420.00"),
            notes="Segunda orden - PAGADA, LOGÍSTICA EN PREPARACIÓN",
            user_id=owner_for_client(1),
        )
        orders.append(order6)
        session.add(order6)
        session.flush()
        items6 = [
            OrderItem(order_id=order6.id, product_id=2, lot_id=1, quantity=2, unit_price=Decimal("180.00"), subtotal=Decimal("360.00")),
            OrderItem(order_id=order6.id, product_id=3, lot_id=3, quantity=1, unit_price=Decimal("60.00"), subtotal=Decimal("60.00")),
        ]
        session.add_all(items6)
        items_count += len(items6)
        
        order7 = Order(
            client_id=2,
            status=OrderStatus.payment_confirmed,
            total=Decimal("285.00"),
            notes="Segunda orden - PAGADA, LOGÍSTICA EN RUTA",
            user_id=owner_for_client(2),
        )
        orders.append(order7)
        session.add(order7)
        session.flush()
        items7 = [
            OrderItem(order_id=order7.id, product_id=5, lot_id=3, quantity=3, unit_price=Decimal("75.00"), subtotal=Decimal("225.00")),
            OrderItem(order_id=order7.id, product_id=4, lot_id=2, quantity=1, unit_price=Decimal("60.00"), subtotal=Decimal("60.00")),
        ]
        session.add_all(items7)
        items_count += len(items7)
        
        order8 = Order(
            client_id=6,
            status=OrderStatus.payment_confirmed,
            total=Decimal("1110.00"),
            notes="La Paz - PAGADA, SIN LOGÍSTICA",
            user_id=owner_for_client(6),
        )
        orders.append(order8)
        session.add(order8)
        session.flush()
        items8 = [
            OrderItem(order_id=order8.id, product_id=7, lot_id=4, quantity=5, unit_price=Decimal("165.00"), subtotal=Decimal("825.00")),
            OrderItem(order_id=order8.id, product_id=8, lot_id=4, quantity=3, unit_price=Decimal("95.00"), subtotal=Decimal("285.00")),
        ]
        session.add_all(items8)
        items_count += len(items8)
        
        order9 = Order(
            client_id=7,
            status=OrderStatus.payment_confirmed,
            total=Decimal("910.00"),
            notes="Oruro - PAGADA, SIN LOGÍSTICA",
            user_id=owner_for_client(7),
        )
        orders.append(order9)
        session.add(order9)
        session.flush()
        items9 = [
            OrderItem(order_id=order9.id, product_id=9, lot_id=4, quantity=3, unit_price=Decimal("220.00"), subtotal=Decimal("660.00")),
            OrderItem(order_id=order9.id, product_id=4, lot_id=2, quantity=1, unit_price=Decimal("250.00"), subtotal=Decimal("250.00")),
        ]
        session.add_all(items9)
        items_count += len(items9)
        
        order10 = Order(
            client_id=8,
            status=OrderStatus.payment_confirmed,
            total=Decimal("1260.00"),
            notes="Cochabamba - PAGADA, SIN LOGÍSTICA",
            user_id=owner_for_client(8),
        )
        orders.append(order10)
        session.add(order10)
        session.flush()
        items10 = [
            OrderItem(order_id=order10.id, product_id=10, lot_id=5, quantity=5, unit_price=Decimal("180.00"), subtotal=Decimal("900.00")),
            OrderItem(order_id=order10.id, product_id=3, lot_id=3, quantity=3, unit_price=Decimal("120.00"), subtotal=Decimal("360.00")),
        ]
        session.add_all(items10)
        items_count += len(items10)
        
        order11 = Order(
            client_id=1,
            status=OrderStatus.payment_confirmed,
            total=Decimal("590.00"),
            notes="Tercera orden - Entregada hace 2 días (historial)",
            user_id=owner_for_client(1),
        )
        orders.append(order11)
        session.add(order11)
        session.flush()
        items11 = [
            OrderItem(order_id=order11.id, product_id=1, lot_id=1, quantity=5, unit_price=Decimal("85.00"), subtotal=Decimal("425.00")),
            OrderItem(order_id=order11.id, product_id=7, lot_id=4, quantity=1, unit_price=Decimal("165.00"), subtotal=Decimal("165.00")),
        ]
        session.add_all(items11)
        items_count += len(items11)
        
        order12 = Order(
            client_id=2,
            status=OrderStatus.payment_confirmed,
            total=Decimal("1545.00"),
            notes="Tercera orden - PAGADA, SIN LOGÍSTICA",
            user_id=owner_for_client(2),
        )
        orders.append(order12)
        session.add(order12)
        session.flush()
        items12 = [
            OrderItem(order_id=order12.id, product_id=2, lot_id=1, quantity=7, unit_price=Decimal("180.00"), subtotal=Decimal("1260.00")),
            OrderItem(order_id=order12.id, product_id=8, lot_id=4, quantity=3, unit_price=Decimal("95.00"), subtotal=Decimal("285.00")),
        ]
        session.add_all(items12)
        items_count += len(items12)
        
        order13 = Order(
            client_id=3,
            status=OrderStatus.payment_confirmed,
            total=Decimal("2060.00"),
            notes="Distribuidor mayorista - PAGADA, SIN LOGÍSTICA",
            user_id=owner_for_client(3),
        )
        orders.append(order13)
        session.add(order13)
        session.flush()
        items13 = [
            OrderItem(order_id=order13.id, product_id=1, lot_id=1, quantity=20, unit_price=Decimal("85.00"), subtotal=Decimal("1700.00")),
            OrderItem(order_id=order13.id, product_id=2, lot_id=1, quantity=2, unit_price=Decimal("180.00"), subtotal=Decimal("360.00")),
        ]
        session.add_all(items13)
        items_count += len(items13)
        
        session.commit()
        print(f"  ✓ {len(orders)} órdenes y {items_count} items creados\n")
        
        print("💳 Insertando pagos...")
        payments = []
        for oid in range(1, 14):
            o = next((x for x in orders if x.id == oid), None)
            if not o:
                continue
            p = Payment(
                order_id=oid,
                status=PaymentStatus.confirmed,
                voucher_path=f"/uploads/voucher_{oid:03d}.jpg",
                notes=f"Orden {oid} confirmada",
                reviewed_at=datetime.now(timezone.utc) if o.status == OrderStatus.payment_confirmed else None,
                user_id=getattr(o, "user_id", None),
            )
            if oid == 3:
                p.status = PaymentStatus.rejected
                p.notes = "RECHAZADA - Cliente debe enviar comprobante válido"
                p.reviewed_at = None
            payments.append(p)
        session.add_all(payments)
        session.commit()
        print(f"  ✓ {len(payments)} pagos creados\n")
        
        print("🚚 Insertando logística...")
        logistics_specs = [
            (2, DeliveryType.shipping, DeliveryStatus.delivered, "Av. Ballivián 500, Cochabamba", "Entregado correctamente hace 3 días", datetime.now() - timedelta(days=4), datetime.now() - timedelta(days=3)),
            (6, DeliveryType.shipping, DeliveryStatus.in_store, "Av. Ballivián 500, Cochabamba", "Orden lista en almacén, pendiente de envío", datetime.now() + timedelta(days=1), None),
            (7, DeliveryType.shipping, DeliveryStatus.sent, "Calle Presidente Montes #456, Cochabamba", "En ruta hacia el cliente", datetime.now(), None),
            (11, DeliveryType.shipping, DeliveryStatus.delivered, "Ceibo S/N, La Paz", "Entregado hace 2 días", datetime.now() - timedelta(days=3), datetime.now() - timedelta(days=2)),
        ]
        logistics = []
        for spec in logistics_specs:
            oid = spec[0]
            o = next((x for x in orders if x.id == oid), None)
            if not o:
                continue
            lg = Logistics(
                order_id=oid,
                delivery_type=spec[1],
                delivery_status=spec[2],
                address=spec[3],
                tracking_notes=spec[4],
                scheduled_at=spec[5],
                delivered_at=spec[6],
                user_id=getattr(o, "user_id", None),
            )
            logistics.append(lg)
        session.add_all(logistics)
        session.commit()
        print(f"  ✓ {len(logistics)} registros de logística creados (muchas órdenes SIN logística para probar)\n")
        
        print("📅 Insertando delivery schedules...")
        # Delivery schedules: attach user_id from order owner
        schedules_specs = [
            (1, datetime.now().date(), "Ceibo S/N, La Paz", "Ceibo S/N", None, DeliveryScheduleStatus.scheduled, "Para hoy - Cliente VIP - Same City", None),
            (13, datetime.now().date(), "Otra ciudad/departamento - Santa Cruz", None, "Santa Cruz", DeliveryScheduleStatus.scheduled, "Para hoy - Mayorista - Other City", None),
            (4, (datetime.now() + timedelta(days=1)).date(), "Otra ciudad/departamento - Sucre", None, "Sucre", DeliveryScheduleStatus.scheduled, "Mañana - Sucre - Other City", None),
            (5, (datetime.now() + timedelta(days=2)).date(), "Otra ciudad/departamento - Tarija", None, "Tarija", DeliveryScheduleStatus.scheduled, "En 2 días - Tarija - Other City", None),
            (11, (datetime.now() - timedelta(days=2)).date(), "Ceibo S/N, La Paz", "Ceibo S/N", None, DeliveryScheduleStatus.delivered, "Entregado hace 2 días - Same City", None),
            (2, (datetime.now() - timedelta(days=3)).date(), "Av. Ballivián 500, Cochabamba", "Av. Ballivián 500", None, DeliveryScheduleStatus.not_delivered, "No se encontró cliente, reprogramada - Same City", (datetime.now() - timedelta(days=2)).date()),
        ]
        delivery_schedules = []
        for spec in schedules_specs:
            oid = spec[0]
            o = next((x for x in orders if x.id == oid), None)
            if not o:
                continue
            ds = DeliverySchedule(
                order_id=oid,
                scheduled_date=spec[1],
                delivery_location=spec[2],
                location=spec[3],
                destination_city=spec[4],
                status=spec[5],
                notes=spec[6],
                rescheduled_date=spec[7],
                user_id=getattr(o, "user_id", None),
            )
            delivery_schedules.append(ds)
        session.add_all(delivery_schedules)
        session.commit()
        print(f"  ✓ {len(delivery_schedules)} delivery schedules creados\n")
        
        print("=" * 70)
        print("✅ BASE DE DATOS POBLADA SATISFACTORIAMENTE")
        print("=" * 70)
        print("\n📊 RESUMEN DATOS CREADOS:")
        print("  • 4 usuarios (admin + 3 vendedores)")
        print("  • 8 clientes en diferentes ciudades/departamentos")
        print("  • 10 productos variados")
        print("  • 5 lotes de importación")
        print("  • 13 órdenes: 12 PAGADAS, 1 sin pagar")
        print("  • 13 pagos: 12 confirmados, 1 rechazado")
        print("  • 4 logísticas creadas (algunos en ruta, algunos entregados)")
        print("  • 9+ órdenes SIN logística para probar creación desde página")
        print("  • 6 delivery schedules: 2 para HOY, 3 próximos días, 1 entregado\n")
        print("📝 CASOS DE PRUEBA LISTOS:")
        print("  ✓ Crear logística desde cero (múltiples órdenes pagadas sin logística)")
        print("  ✓ Asignar destino (misma ciudad vs otra ciudad)")
        print("  ✓ Ver entregas de hoy (2 órdenes programadas para hoy)")
        print("  ✓ Marcar entregado/no entregado")
        print("  ✓ Ver historial de entregas completadas")
        print("  ✓ Múltiples órdenes del mismo cliente")
        print("  ✓ Diferentes ciudades/departamentos\n")
        print("🔐 CREDENCIALES DE PRUEBA:\n")
        print("  Admin:")
        print("    Email: admin@livesale.bo")
        print("    Password: admin123\n")
        print("  Vendedor 1:")
        print("    Email: maria@livesale.bo")
        print("    Password: seller123\n")
        print("  Vendedor 2:")
        print("    Email: juan@livesale.bo")
        print("    Password: seller123\n")
        print("  Vendedor 3:")
        print("    Email: luis@livesale.bo")
        print("    Password: seller123\n")
        print("=" * 70 + "\n")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error durante la siembra de datos: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()

def main():
    print("\n" + "=" * 60)
    print("🔄 LIMPIEZA Y SIEMBRA DE BASE DE DATOS")
    print("=" * 60 + "\n")
    
    engine = create_engine(settings.DATABASE_URL)
    
    force_seed = os.getenv("SEED_FORCE", "0").strip().lower() in {"1", "true", "yes", "y", "s"}
    if not force_seed:
        confirm = input("⚠️  Este script BORRARÁ TODOS los datos existentes. ¿Continuar? (s/n): ")
        if confirm.strip().lower() != 's':
            print("❌ Operación cancelada")
            sys.exit(0)
    
    clear_database(engine)
    seed_database(engine)
    
    print("🎉 ¡Proceso completado exitosamente!")

if __name__ == "__main__":
    main()
