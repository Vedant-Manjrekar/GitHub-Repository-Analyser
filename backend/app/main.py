import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional

from app.init_db import init_db
from app.database import get_db
from app.models import Repository, Contributor, Commit, File as ModelFile, RepositoryScore, User, UserRepositoryAssociation
from app.schemas import RepositoryCreate, RepositoryResponse, DashboardResponse, RepositoryScoreResponse, ContributorResponse, FileResponse
from app.workers.tasks import analyze_repository_task
from app.analyzers.churn import calculate_churn_trends


USE_CELERY = os.getenv("USE_CELERY", "false").lower() == "true"

def run_analysis_task(repo_id: str, background_tasks: BackgroundTasks):
    if USE_CELERY:
        analyze_repository_task.delay(repo_id)
    else:
        print(f"USE_CELERY=false. Running analysis task in FastAPI BackgroundTasks thread for repo: {repo_id}")
        background_tasks.add_task(analyze_repository_task, repo_id)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on server startup
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization failed: {e}")
    yield

app = FastAPI(
    title="Git Repository Analytics API", 
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"Unhandled exception: {exc}")
    traceback.print_exc()
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        detail = exc.detail
    else:
        status_code = 500
        detail = "Internal server error. Please check backend logs or try again."
        
    response = JSONResponse(
        status_code=status_code,
        content={"detail": detail},
    )
    # Since Starlette exception handlers bypass standard middleware, manually append CORS headers here
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.get("/")
def read_root():
    return {"message": "Welcome to the Git Repository Analytics API", "status": "active"}

# --- Repository Endpoints ---

@app.post("/repositories/clone", response_model=RepositoryResponse)
def clone_new_repository(
    payload: RepositoryCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Clones a Git repository from a URL and triggers analysis in the background."""
    if not payload.repo_url:
        raise HTTPException(status_code=400, detail="Repository URL must be provided.")
        
    clean_url = payload.repo_url.strip()
    
    # Check if this repository has already been successfully analyzed
    existing_repo = db.query(Repository).filter(
        Repository.repo_url == clean_url,
        Repository.status == "completed"
    ).first()
    
    if existing_repo:
        # Re-use existing analysis and create/update user-repository association if user_email is provided
        if payload.user_email:
            user = db.query(User).filter(User.email == payload.user_email.strip().lower()).first()
            if user:
                # Check if association already exists
                assoc = db.query(UserRepositoryAssociation).filter(
                    UserRepositoryAssociation.user_id == user.id,
                    UserRepositoryAssociation.repository_id == existing_repo.id
                ).first()
                if not assoc:
                    new_assoc = UserRepositoryAssociation(
                        user_id=user.id,
                        repository_id=existing_repo.id
                    )
                    db.add(new_assoc)
                else:
                    # Update the analyzed_at timestamp to reflect the re-analysis
                    assoc.analyzed_at = func.now()
                db.commit()
        return existing_repo
        
    # Otherwise, it's a new repository analysis
    repo = Repository(
        name=payload.name,
        repo_url=clean_url,
        status="pending"
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    
    # Associate the new repository with the user who initiated the analysis
    if payload.user_email:
        user = db.query(User).filter(User.email == payload.user_email.strip().lower()).first()
        if user:
            new_assoc = UserRepositoryAssociation(
                user_id=user.id,
                repository_id=repo.id
            )
            db.add(new_assoc)
            db.commit()

    # Enqueue background analysis task
    run_analysis_task(str(repo.id), background_tasks)
    
    return repo



@app.get("/repositories/{repo_id}", response_model=RepositoryResponse)
def get_repository_details(repo_id: str, db: Session = Depends(get_db)):
    """Retrieves basic details about a repository."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    return repo

@app.delete("/repositories/{repo_id}")
def delete_repository(repo_id: str, db: Session = Depends(get_db)):
    """Deletes a repository and all its related parsed data."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    # Remove files from uploads folder on disk if they exist
    repo_path = os.path.join(UPLOADS_DIR, repo_id)
    if os.path.exists(repo_path):
        try:
            shutil.rmtree(repo_path)
        except Exception as e:
            print(f"Warning: Failed to delete physical files: {e}")
            
    db.delete(repo)
    db.commit()
    return {"message": f"Repository {repo_id} deleted successfully."}

# --- Branch Management ---

from pydantic import BaseModel

class SwitchBranchPayload(BaseModel):
    branch: str

@app.get("/repositories/{repo_id}/branches")
def get_repository_branches(repo_id: str, db: Session = Depends(get_db)):
    """Lists all available local and remote branches for a repository."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    try:
        import git
        g = git.cmd.Git()
        # Run ls-remote to get heads without cloning
        output = g.ls_remote('--heads', repo.repo_url)
        branches = []
        for line in output.splitlines():
            if 'refs/heads/' in line:
                branch_name = line.split('refs/heads/')[-1].strip()
                if branch_name:
                    branches.append(branch_name)
        if not branches:
            branches = [repo.branch or "main"]
        return {"branches": sorted(list(set(branches)))}
    except Exception as e:
        print(f"Error fetching remote branches: {e}")
        return {"branches": [repo.branch or "main"]}

@app.post("/repositories/{repo_id}/branch")
def switch_repository_branch(
    repo_id: str,
    payload: SwitchBranchPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Switches the active analysis branch of a repository and schedules analysis."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    try:
        # Update repo branch & trigger analysis rebuild
        repo.branch = payload.branch
        repo.status = "pending"
        repo.error_message = None
        db.commit()
        
        # Clear child tables
        db.query(Contributor).filter(Contributor.repository_id == repo.id).delete()
        db.query(Commit).filter(Commit.repository_id == repo.id).delete()
        db.query(ModelFile).filter(ModelFile.repository_id == repo.id).delete()
        db.query(RepositoryScore).filter(RepositoryScore.repository_id == repo.id).delete()
        db.commit()
        
        # Clean up local repository directory if it exists, so a clean clone is triggered
        from app.git.clone import get_repo_dir
        repo_dir = get_repo_dir(str(repo.id))
        if os.path.exists(repo_dir):
            try:
                shutil.rmtree(repo_dir)
            except Exception:
                pass
                
        run_analysis_task(str(repo.id), background_tasks)
        return {"message": f"Switched to branch {payload.branch}.", "status": "pending"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to checkout branch: {str(e)}")

# --- Ingestion Status ---

@app.get("/analysis/{repo_id}/status")
def get_analysis_status(repo_id: str, db: Session = Depends(get_db)):
    """Returns the current status of the repository analysis pipeline."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
    return {
        "status": repo.status, 
        "error_message": repo.error_message
    }

@app.post("/analysis/{repo_id}")
def restart_analysis(
    repo_id: str, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Clears old metrics and restarts the analysis pipeline for an existing repository."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    # Delete child data before triggering a re-run
    db.query(Contributor).filter(Contributor.repository_id == repo.id).delete()
    db.query(Commit).filter(Commit.repository_id == repo.id).delete()
    db.query(ModelFile).filter(ModelFile.repository_id == repo.id).delete()
    db.query(RepositoryScore).filter(RepositoryScore.repository_id == repo.id).delete()
    
    repo.status = "pending"
    repo.error_message = None
    db.commit()
    
    # Enqueue background task (we assume files are already on disk)
    run_analysis_task(str(repo.id), background_tasks)
    
    return {"message": "Analysis restarted.", "status": "pending"}

# --- Dashboard API ---

@app.get("/analysis/{repo_id}/dashboard", response_model=DashboardResponse)
def get_dashboard_summary(repo_id: str, db: Session = Depends(get_db)):
    """Compiles the high-level metrics dashboard data for a repository."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    if repo.status != "completed":
        raise HTTPException(status_code=400, detail=f"Analysis is not completed (Current status: {repo.status}).")
        
    scores = db.query(RepositoryScore).filter(RepositoryScore.repository_id == repo.id).first()
    
    total_commits = db.query(Commit).filter(Commit.repository_id == repo.id).count()
    total_contributors = db.query(Contributor).filter(Contributor.repository_id == repo.id).count()
    total_files = db.query(ModelFile).filter(ModelFile.repository_id == repo.id).count()
    
    # Get top programming languages
    # Query distinct file languages and their file count
    lang_query = db.query(
        ModelFile.language, 
        func.count(ModelFile.id)
    ).filter(
        ModelFile.repository_id == repo.id,
        ModelFile.language != None,
        ModelFile.language != ""
    ).group_by(
        ModelFile.language
    ).order_by(
        func.count(ModelFile.id).desc()
    ).all()
    
    top_languages = [{"language": row[0], "count": row[1]} for row in lang_query]
    
    # Get recent commits for activity mapping
    recent_commits = db.query(Commit).filter(
        Commit.repository_id == repo.id
    ).order_by(
        Commit.date.desc()
    ).limit(150).all()
    
    return {
        "repository": repo,
        "scores": scores,
        "total_commits": total_commits,
        "total_contributors": total_contributors,
        "total_files": total_files,
        "top_languages": top_languages,
        "recent_commits": recent_commits
    }

# --- Analytical Sub-routes (Metrics & Charts) ---

@app.get("/analysis/{repo_id}/complexity", response_model=List[FileResponse])
def get_most_complex_files(repo_id: str, db: Session = Depends(get_db)):
    """Returns files in the repository ordered by cyclomatic complexity descending."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    return db.query(ModelFile).filter(
        ModelFile.repository_id == repo.id
    ).order_by(
        ModelFile.complexity.desc()
    ).limit(10).all()

@app.get("/analysis/{repo_id}/churn")
def get_code_churn_trends(repo_id: str, db: Session = Depends(get_db)):
    """Calculates churn timeline points and identifies the files modified most frequently."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    # Get all commits
    commits = db.query(Commit).filter(Commit.repository_id == repo.id).all()
    commits_list = [{"date": c.date, "additions": c.additions, "deletions": c.deletions} for c in commits]
    
    # Get monthly trends
    trends = calculate_churn_trends(commits_list)
    
    # Get top 10 frequently modified files
    top_churn_files = db.query(ModelFile).filter(
        ModelFile.repository_id == repo.id
    ).order_by(
        ModelFile.churn.desc()
    ).limit(10).all()
    
    return {
        "timeline": trends,
        "top_churn_files": top_churn_files
    }

@app.get("/analysis/{repo_id}/hotspots", response_model=List[FileResponse])
def get_code_hotspots(repo_id: str, db: Session = Depends(get_db)):
    """Retrieves top hotspot files combining high complexity and modification ratios."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    return db.query(ModelFile).filter(
        ModelFile.repository_id == repo.id
    ).order_by(
        ModelFile.hotspot_score.desc()
    ).limit(10).all()

@app.get("/analysis/{repo_id}/bus-factor")
def get_bus_factor_insights(repo_id: str, db: Session = Depends(get_db)):
    """Returns calculated project bus factor and key ownership dependencies."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    scores = db.query(RepositoryScore).filter(RepositoryScore.repository_id == repo.id).first()
    bus_factor = scores.bus_factor if scores else 0.0
    
    # Count files owned by each developer
    owner_stats = db.query(
        ModelFile.owner,
        func.count(ModelFile.id)
    ).filter(
        ModelFile.repository_id == repo.id,
        ModelFile.owner != None,
        ModelFile.owner != "Unknown"
    ).group_by(
        ModelFile.owner
    ).order_by(
        func.count(ModelFile.id).desc()
    ).all()
    
    ownership_distribution = [{"owner": row[0], "files_owned": row[1]} for row in owner_stats]
    
    return {
        "bus_factor": bus_factor,
        "ownership_distribution": ownership_distribution
    }

@app.get("/analysis/{repo_id}/contributors", response_model=List[ContributorResponse])
def get_contributor_list(repo_id: str, db: Session = Depends(get_db)):
    """Returns all contributors ranked by total commit count."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    contributors = db.query(Contributor).filter(
        Contributor.repository_id == repo.id
    ).order_by(
        Contributor.commits.desc()
    ).all()
    
    # Query database to find files owned by each contributor
    for c in contributors:
        owned = db.query(ModelFile.path).filter(
            ModelFile.repository_id == repo.id,
            ModelFile.owner.like(f"%<{c.email}>%") | ModelFile.owner.like(f"%{c.email}%") | ModelFile.owner.like(f"%{c.name}%")
        ).all()
        c.owned_files = [o[0] for o in owned]
        
    return contributors

@app.get("/analysis/{repo_id}/technical-debt")
def get_technical_debt_insights(repo_id: str, db: Session = Depends(get_db)):
    """Aggregates complexity ratios, files size counts, and TODO comment indices."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    scores = db.query(RepositoryScore).filter(RepositoryScore.repository_id == repo.id).first()
    
    # Count large files by scanning file table.
    # Note: We don't save LOC directly in the DB ModelFile table, but we can proxy it via high complexity or run counts
    # Wait, LOC was calculated in Lizard but we stored complexity in ModelFile.
    # Let's count files with high complexity (e.g. complexity > 8) as debt indicators, or retrieve files count.
    total_files = db.query(ModelFile).filter(ModelFile.repository_id == repo.id).count()
    complex_files_count = db.query(ModelFile).filter(
        ModelFile.repository_id == repo.id,
        ModelFile.complexity > 10.0
    ).count()
    
    return {
        "technical_debt_score": scores.technical_debt if scores else 0.0,
        "health_score": scores.health_score if scores else 100.0,
        "total_files": total_files,
        "complex_files_count": complex_files_count,
        "ai_summary": scores.ai_summary if scores else None
    }

# --- Database-backed Authentication & Scoped Recents ---

class RegisterPayload(BaseModel):
    email: str
    name: str
    password: str

@app.post("/auth/register")
def register_user(payload: RegisterPayload, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already registered.")
    user = User(
        email=payload.email.strip().lower(),
        name=payload.name.strip(),
        password=payload.password
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"email": user.email, "name": user.name}

class LoginPayload(BaseModel):
    email: str
    password: str

@app.post("/auth/login")
def login_user(payload: LoginPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"email": user.email, "name": user.name}

@app.get("/analysis/recents")
def get_recent_analyses(email: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns the authenticated user's recently analyzed repositories.
    Always scoped to the requesting user — never returns data from other users.
    A newly registered user with no analyses will receive an empty list.
    """
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required to view recent analyses.")

    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    # Query the user's own association records, joined with the repository details.
    # This is the ONLY source of truth — we never fall back to the global repositories table.
    results = (
        db.query(UserRepositoryAssociation, Repository)
        .join(Repository, UserRepositoryAssociation.repository_id == Repository.id)
        .filter(
            UserRepositoryAssociation.user_id == user.id,
            Repository.status == "completed"
        )
        .order_by(UserRepositoryAssociation.analyzed_at.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "id": str(repo.id),
            "name": repo.name,
            "repo_url": repo.repo_url,
            "status": repo.status,
            # analyzed_at comes from the per-user association — not the global repo timestamp
            "analyzed_at": assoc.analyzed_at.isoformat() if assoc.analyzed_at else None,
            "last_analyzed_at": repo.last_analyzed_at.isoformat() if repo.last_analyzed_at else None,
        }
        for assoc, repo in results
    ]

@app.delete("/analysis/{repo_id}")
def remove_recent_analysis(repo_id: str, email: str, db: Session = Depends(get_db)):
    """
    Removes the repository from the user's recently analyzed list by deleting the association.
    """
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    assoc = db.query(UserRepositoryAssociation).filter(
        UserRepositoryAssociation.user_id == user.id,
        UserRepositoryAssociation.repository_id == repo_id
    ).first()
    
    if not assoc:
        raise HTTPException(status_code=404, detail="Repository association not found.")
        
    db.delete(assoc)
    db.commit()
    return {"status": "success", "message": "Repository removed from recents."}


