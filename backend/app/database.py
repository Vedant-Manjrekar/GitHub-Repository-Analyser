import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Retrieve database connection string from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://vedantmanjrekar:vedu%40postgres@localhost:5432/git_analytics"
)

# Create the SQLAlchemy engine.
# Note: For PostgreSQL, we don't need connect_args={"check_same_thread": False} which is SQLite specific.
engine = create_engine(DATABASE_URL)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()

def get_db():
    """FastAPI dependency to provide a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
