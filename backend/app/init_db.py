import sys
import os

# Add root folder to python path to allow absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
# Import models to ensure they are registered on Metadata
from app.models import Repository, Contributor, Commit, File, RepositoryScore, User, UserRepositoryAssociation

def init_db():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Ensure branch column exists (SQLite ALTER TABLE fallback)
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("ALTER TABLE repositories ADD COLUMN branch VARCHAR DEFAULT 'main';"))
            conn.commit()
            print("Successfully added branch column to repositories table.")
    except Exception as e:
        # Ignore if column already exists
        pass
        
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("ALTER TABLE repositories ADD COLUMN last_analyzed_at TIMESTAMP;"))
            conn.commit()
            print("Successfully added last_analyzed_at column to repositories table.")
    except Exception as e:
        # Ignore if column already exists
        pass
        
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("ALTER TABLE files ADD COLUMN content TEXT;"))
            conn.commit()
            print("Successfully added content column to files table.")
    except Exception as e:
        # Ignore if column already exists
        pass

    # Add analyzed_at column to user_repository_associations if it doesn't exist
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text(
                "ALTER TABLE user_repository_associations "
                "ADD COLUMN analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"
            ))
            conn.commit()
            print("Successfully added analyzed_at column to user_repository_associations table.")
    except Exception as e:
        # Ignore if column already exists
        pass

    # Add unique constraint on (user_id, repository_id) if it doesn't exist
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text(
                "ALTER TABLE user_repository_associations "
                "ADD CONSTRAINT uq_user_repository UNIQUE (user_id, repository_id);"
            ))
            conn.commit()
            print("Successfully added unique constraint uq_user_repository.")
    except Exception as e:
        # Ignore if constraint already exists
        pass

    print("Database tables initialized successfully!")


if __name__ == "__main__":
    init_db()
