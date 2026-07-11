import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    repo_url = Column(String, nullable=True)
    language = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)  # pending, cloning, analyzing, completed, failed
    error_message = Column(Text, nullable=True)
    branch = Column(String, default="main", nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    contributors = relationship("Contributor", back_populates="repository", cascade="all, delete-orphan")
    commits = relationship("Commit", back_populates="repository", cascade="all, delete-orphan")
    files = relationship("File", back_populates="repository", cascade="all, delete-orphan")
    scores = relationship("RepositoryScore", back_populates="repository", uselist=False, cascade="all, delete-orphan")


class Contributor(Base):
    __tablename__ = "contributors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    commits = Column(Integer, default=0, nullable=False)

    # Relationships
    repository = relationship("Repository", back_populates="contributors")


class Commit(Base):
    __tablename__ = "commits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    hash = Column(String, nullable=False)
    author = Column(String, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    additions = Column(Integer, default=0, nullable=False)
    deletions = Column(Integer, default=0, nullable=False)

    # Relationships
    repository = relationship("Repository", back_populates="commits")


class File(Base):
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    path = Column(String, nullable=False)
    language = Column(String, nullable=True)
    complexity = Column(Float, default=0.0, nullable=False)
    churn = Column(Integer, default=0, nullable=False)
    hotspot_score = Column(Float, default=0.0, nullable=False)
    owner = Column(String, nullable=True)
    content = Column(Text, nullable=True)

    # Relationships
    repository = relationship("Repository", back_populates="files")


class RepositoryScore(Base):
    __tablename__ = "repository_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), unique=True, nullable=False)
    bus_factor = Column(Float, default=0.0, nullable=False)
    technical_debt = Column(Float, default=0.0, nullable=False)
    health_score = Column(Float, default=0.0, nullable=False)
    ai_summary = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    repository = relationship("Repository", back_populates="scores")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)


class UserRepositoryAssociation(Base):
    __tablename__ = "user_repository_associations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    associated_at = Column(DateTime(timezone=True), server_default=func.now())
    # Explicit timestamp recording when the authenticated user analyzed this repository
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "repository_id", name="uq_user_repository"),
    )

    # Relationships
    user = relationship("User", backref="repository_associations")
    repository = relationship("Repository", backref="user_associations")
