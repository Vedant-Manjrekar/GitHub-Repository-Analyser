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

# Event listener for SQLAlchemy Session to handle database-wide defensive NUL byte sanitization before commit
from sqlalchemy import event
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from sqlalchemy.sql.sqltypes import String, Text

@event.listens_for(Session, "before_commit")
def before_commit_handler(session):
    for obj in list(session.new) + list(session.dirty):
        try:
            insp = inspect(obj)
            mapper = insp.mapper
            repo_id = getattr(obj, "repository_id", None) or getattr(obj, "id", "N/A")
            for column in mapper.columns:
                if isinstance(column.type, (String, Text)):
                    val = getattr(obj, column.key)
                    if isinstance(val, str) and "\x00" in val:
                        path_info = getattr(obj, "path", "N/A")
                        print(f"DEFENSIVE SANITIZATION: Found NUL character in database commit! "
                              f"Model: {obj.__class__.__name__}, Column: {column.key}, "
                              f"Path: {path_info}, Repo ID: {repo_id}")
                        setattr(obj, column.key, val.replace("\x00", ""))
        except Exception as e:
            print(f"Error during defensive NUL byte sanitization before commit: {e}")
