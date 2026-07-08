import os
import uuid
import shutil
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from app.init_db import init_db
from app.database import get_db
from app.models import Repository, Contributor, Commit, File as ModelFile, RepositoryScore
from app.schemas import RepositoryCreate, RepositoryResponse, DashboardResponse, RepositoryScoreResponse, ContributorResponse, FileResponse
from app.workers.tasks import analyze_repository_task
from app.analyzers.churn import calculate_churn_trends

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.getenv("UPLOADS_DIR", os.path.join(BASE_DIR, "uploads"))

USE_CELERY = os.getenv("USE_CELERY", "false").lower() == "true"

def run_analysis_task(repo_id: str, background_tasks: BackgroundTasks, zip_path: str = None):
    if USE_CELERY:
        analyze_repository_task.delay(repo_id, zip_path)
    else:
        print(f"USE_CELERY=false. Running analysis task in FastAPI BackgroundTasks thread for repo: {repo_id}")
        background_tasks.add_task(analyze_repository_task, repo_id, zip_path)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on server startup
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization failed: {e}")
    # Ensure uploads directory exists
    os.makedirs(UPLOADS_DIR, exist_ok=True)
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
    print(f"Unhandled exception: {exc}")
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Database or Server Error: {str(exc)}"},
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
        
    repo = Repository(
        name=payload.name,
        repo_url=payload.repo_url,
        status="pending"
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    
    # Enqueue background analysis task
    run_analysis_task(str(repo.id), background_tasks)
    
    return repo

@app.post("/repositories/upload", response_model=RepositoryResponse)
def upload_repository_zip(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db)
):
    """Uploads a repository ZIP file and triggers analysis in the background."""
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported.")
        
    # Generate unique ID for repo and save the zip temporarily
    repo_id = uuid.uuid4()
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    temp_zip_path = os.path.join(UPLOADS_DIR, f"temp_{repo_id}.zip")
    
    try:
        with open(temp_zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write uploaded file: {str(e)}")
        
    repo = Repository(
        id=repo_id,
        name=name,
        status="pending"
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    
    # Enqueue background analysis task with ZIP path
    run_analysis_task(str(repo.id), background_tasks, temp_zip_path)
    
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
        
    if repo.repo_url:
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
    else:
        # ZIP upload
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
        
    if not repo.repo_url:
        raise HTTPException(status_code=400, detail="Cannot switch branch of a non-git project.")
        
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
