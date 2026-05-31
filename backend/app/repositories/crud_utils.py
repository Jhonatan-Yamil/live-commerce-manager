from sqlalchemy.orm import Session


def create_entity(db: Session, model, payload: dict):
    instance = model(**payload)
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


def list_entities(db: Session, model, *filters):
    query = db.query(model)
    if filters:
        query = query.filter(*filters)
    return query.all()


def scoped_query(db: Session, model, user_id: int | None = None):
    q = db.query(model)
    if user_id is not None and hasattr(model, "user_id"):
        q = q.filter(getattr(model, "user_id") == user_id)
    return q


def get_entity_by_id(db: Session, model, entity_id: int):
    return db.query(model).filter(model.id == entity_id).first()


def update_entity(db: Session, instance, payload: dict):
    if not instance:
        return None

    for key, value in payload.items():
        setattr(instance, key, value)

    db.commit()
    db.refresh(instance)
    return instance