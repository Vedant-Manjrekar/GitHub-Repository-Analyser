from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# --- Base Schema (Config Shared) ---
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# --- Repository Schemas ---
class RepositoryCreate(BaseSchema):
    name: str
    repo_url: str
    user_email: Optional[str] = None

class RepositoryResponse(BaseSchema):
    id: UUID
    name: str
    repo_url: Optional[str] = None
    language: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    branch: Optional[str] = "main"
    last_analyzed_at: Optional[datetime] = None

# --- Contributor Schemas ---
class ContributorResponse(BaseSchema):
    id: UUID
    repository_id: UUID
    name: str
    email: str
    commits: int
    owned_files: Optional[List[str]] = None

# --- Commit Schemas ---
class CommitResponse(BaseSchema):
    id: UUID
    repository_id: UUID
    hash: str
    author: str
    date: datetime
    additions: int
    deletions: int

# --- File Schemas ---
class FileResponse(BaseSchema):
    id: UUID
    repository_id: UUID
    path: str
    language: Optional[str] = None
    complexity: float
    churn: int
    hotspot_score: float
    owner: Optional[str] = None
    content: Optional[str] = None

# --- Repository Score Schemas ---
class RepositoryScoreResponse(BaseSchema):
    id: UUID
    repository_id: UUID
    bus_factor: float
    technical_debt: float
    health_score: float
    ai_summary: Optional[str] = None
    updated_at: datetime

# --- Dashboard & Custom Analytical Schemas ---
class DashboardResponse(BaseSchema):
    repository: RepositoryResponse
    scores: Optional[RepositoryScoreResponse] = None
    total_commits: int
    total_contributors: int
    total_files: int
    top_languages: List[dict]  # list of {"language": str, "count": int}
    recent_commits: List[CommitResponse]

class ChurnTrendPoint(BaseSchema):
    date: str  # e.g., "YYYY-MM-DD" or "Week X"
    commits: int
    additions: int
    deletions: int

class AnalyticsSummaryResponse(BaseSchema):
    health_score: float
    bus_factor: float
    technical_debt: float
    ai_summary: Optional[str]
    contributors: List[ContributorResponse]
    hotspots: List[FileResponse]
    complexity_distribution: List[dict]  # data points for histogram or lists
    churn_timeline: List[ChurnTrendPoint]
