"""
Database connection setup.
Uses SQLite by default (file stored in backend/data/app.db) so the data
survives server restarts. Swap DATABASE_URL to a Postgres URL later if
you deploy on a proper server - no other code needs to change.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite:///{os.path.join(DATA_DIR, 'app.db')}"
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency - gives each request its own DB session and
    always closes it, even if the request raises an error."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
