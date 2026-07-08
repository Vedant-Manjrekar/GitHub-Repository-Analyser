import os
import sys
import traceback
import shutil
from celery import Celery
from sqlalchemy import func
from sqlalchemy.orm import Session

# Add root folder to python path to allow absolute imports in celery workers
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import Repository, Contributor, Commit, File, RepositoryScore
from app.git.clone import clone_repository, extract_zip_repository, get_repo_dir
from app.git.history import get_git_history
from app.git.parser import scan_repository_files
from app.analyzers.complexity import analyze_file_complexity
from app.analyzers.hotspots import calculate_hotspot_scores
from app.analyzers.bus_factor import calculate_bus_factor
from app.analyzers.contributors import analyze_contributor_metrics
from app.analyzers.debt import calculate_technical_debt
from app.ai.insights import generate_codebase_insights

# Configure Celery
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery_app = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)

@celery_app.task(name="analyze_repository_task")
def analyze_repository_task(repo_id: str, zip_path: str = None) -> bool:
    """Executes the asynchronous repository analysis pipeline."""
    db: Session = SessionLocal()
    
    try:
        # 1. Fetch Repository Row
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not repo:
            print(f"Error: Repository {repo_id} not found in database.")
            return False
            
        print(f"Starting async analysis pipeline for repository: {repo.name} ({repo_id})")
        
        # 2. Clone or Extract Ingestion
        repo.status = "cloning"
        db.commit()
        
        repo_dir = None
        if zip_path:
            repo.status = "extracting"
            db.commit()
            repo_dir = extract_zip_repository(zip_path, str(repo_id))
            # Delete temporary ZIP file
            if os.path.exists(zip_path):
                os.remove(zip_path)
        elif repo.repo_url:
            repo_dir = clone_repository(repo.repo_url, str(repo_id), branch=repo.branch)
        else:
            raise ValueError("No repository source (URL or ZIP upload) was provided.")
            
        # 3. Scan codebase layout
        repo.status = "analyzing"
        db.commit()
        
        rel_files, language_counts, primary_language = scan_repository_files(repo_dir)
        repo.language = primary_language
        db.commit()
        
        # 4. Crawl Git commit logs
        commits_list, contributors_map, file_churn_map = get_git_history(repo_dir)
        
        # Store Contributors
        contributors_db_map = {}  # Map contributor email -> DB Model id
        for email, c in contributors_map.items():
            contrib_model = Contributor(
                repository_id=repo.id,
                name=c["name"],
                email=c["email"],
                commits=c["commits"]
            )
            db.add(contrib_model)
            contributors_db_map[email] = contrib_model
            
        # Store Commits
        for c in commits_list:
            commit_model = Commit(
                repository_id=repo.id,
                hash=c["hash"],
                author=c["author"],
                date=c["date"],
                additions=c["additions"],
                deletions=c["deletions"]
            )
            db.add(commit_model)
            
        db.commit()
        
        # 5. Compute complexity & map churn parameters per file
        raw_files_data = []
        for file_rel_path in rel_files:
            file_abs_path = os.path.join(repo_dir, file_rel_path)
            
            # Lizard complexity
            metrics = analyze_file_complexity(file_abs_path)
            
            # Git metrics (churn + owner)
            git_stats = file_churn_map.get(file_rel_path, {"churn_count": 0, "additions": 0, "deletions": 0, "owner": "Unknown"})
            
            raw_files_data.append({
                "path": file_rel_path,
                "language": os.path.splitext(file_rel_path)[1].lower(),
                "complexity": metrics["average_complexity"],
                "loc": metrics["loc"],
                "churn": git_stats["churn_count"],
                "owner": git_stats["owner"]
            })
            
        # 6. Run Hotspot detector
        hotspot_results = calculate_hotspot_scores(raw_files_data)
        
        # Store Files in database
        files_db_list = []
        for f in hotspot_results:
            file_abs_path = os.path.join(repo_dir, f["path"])
            content_str = None
            try:
                if os.path.exists(file_abs_path) and os.path.isfile(file_abs_path):
                    with open(file_abs_path, "r", encoding="utf-8", errors="ignore") as file_content_f:
                        content_str = file_content_f.read()
            except Exception as read_err:
                print(f"Warning: Failed to read content of file {f['path']}: {read_err}")

            file_model = File(
                repository_id=repo.id,
                path=f["path"],
                language=f["language"],
                complexity=f["complexity"],
                churn=f["churn"],
                hotspot_score=f["hotspot_score"],
                owner=f["owner"],
                content=content_str
            )
            db.add(file_model)
            files_db_list.append(file_model)
            
        db.commit()
        
        # 7. Compute high-level aggregated scores
        bus_factor = calculate_bus_factor(hotspot_results)
        
        contributor_analysis = analyze_contributor_metrics(contributors_map)
        
        # We need a list of files matching debt inputs (loc, complexity, path, churn)
        debt_results = calculate_technical_debt(repo_dir, raw_files_data)
        
        # 8. Generate AI Codebase review
        # Assemble metrics dictionary for the AI insights generator
        ai_payload = {
            "health_score": debt_results["health_score"],
            "bus_factor": bus_factor,
            "technical_debt": debt_results["technical_debt"],
            "primary_language": primary_language,
            "large_files_count": debt_results["large_files_count"],
            "total_todos": debt_results["total_todos"],
            "hotspots": hotspot_results[:10],  # send top 10 hotspots
            "contributors": contributor_analysis["contributors"]
        }
        
        ai_summary = generate_codebase_insights(repo.name, ai_payload)
        
        # Store Scores in database
        scores_model = RepositoryScore(
            repository_id=repo.id,
            bus_factor=bus_factor,
            technical_debt=debt_results["technical_debt"],
            health_score=debt_results["health_score"],
            ai_summary=ai_summary
        )
        db.add(scores_model)
        
        # 9. Update Repository status to completed
        repo.status = "completed"
        repo.last_analyzed_at = func.now()
        db.commit()
        print(f"Successfully completed analysis pipeline for {repo.name} ({repo_id})")
        
        # Clean up repository from disk
        if repo_dir and os.path.exists(repo_dir):
            try:
                shutil.rmtree(repo_dir)
                print(f"Deleted repository directory after successful analysis: {repo_dir}")
            except Exception as e:
                print(f"Warning: Failed to delete repository directory: {e}")
                
        return True
        
    except Exception as e:
        db.rollback()
        # Log stack trace
        err_msg = f"Analysis failed: {str(e)}\n{traceback.format_exc()}"
        print(err_msg)
        
        # Update repository status to failed
        try:
            repo = db.query(Repository).filter(Repository.id == repo_id).first()
            if repo:
                repo.status = "failed"
                repo.error_message = str(e)
                repo.last_analyzed_at = func.now()
                db.commit()
        except Exception as db_err:
            print(f"Error saving failed status to database: {db_err}")
            
        # Clean up repository from disk if it exists
        try:
            from app.git.clone import get_repo_dir
            target_dir = get_repo_dir(repo_id)
            if os.path.exists(target_dir):
                shutil.rmtree(target_dir)
                print(f"Deleted repository directory after failed analysis: {target_dir}")
        except Exception as clean_err:
            print(f"Warning: Failed to delete repository directory on failure: {clean_err}")
            
        return False
        
    finally:
        db.close()
