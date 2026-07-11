import os
import shutil
import git

# Base upload directory inside the workspace/container
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.getenv("UPLOADS_DIR", os.path.join(BASE_DIR, "uploads"))

def get_repo_dir(repo_id: str) -> str:
    """Returns the absolute path to a repository's storage directory."""
    # Ensure UPLOADS_DIR exists
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    return os.path.join(UPLOADS_DIR, str(repo_id))

def cleanup_cloned_repositories(new_repo_id: str):
    """Enforces that at most 2 cloned repositories exist on disk.
    If the limit is reached, it deletes the oldest cloned repository or any processed repository.
    """
    if not os.path.exists(UPLOADS_DIR):
        return

    # List all subdirectories in UPLOADS_DIR
    dirs = []
    for d in os.listdir(UPLOADS_DIR):
        dir_path = os.path.join(UPLOADS_DIR, d)
        if os.path.isdir(dir_path):
            dirs.append(d)

    # We are about to clone/extract a new repository.
    # If the limit (2) is already reached or exceeded, we must delete directories to bring it below 2.
    if len(dirs) < 2:
        return

    # To avoid circular imports, import db and models inside the function
    from app.database import SessionLocal
    from app.models import Repository
    from datetime import datetime

    db = SessionLocal()
    try:
        repo_data = {}
        for d in dirs:
            repo = db.query(Repository).filter(Repository.id == d).first()
            if repo:
                repo_data[d] = {
                    "status": repo.status,
                    "created_at": repo.created_at or datetime.min,
                    "last_analyzed_at": repo.last_analyzed_at or repo.created_at or datetime.min
                }
            else:
                # If directory exists but not in DB, delete it
                try:
                    shutil.rmtree(os.path.join(UPLOADS_DIR, d))
                except Exception:
                    pass
                if d in dirs:
                    dirs.remove(d)

        # Re-check count after removing orphans
        if len(dirs) < 2:
            return

        # First, remove completed or failed repositories from disk
        processed_dirs = [d for d in dirs if repo_data.get(d, {}).get("status") in ["completed", "failed"]]
        for d in processed_dirs:
            try:
                shutil.rmtree(os.path.join(UPLOADS_DIR, d))
                print(f"Cleaned up processed repository directory {d} to respect 2-repo limit.")
            except Exception as e:
                print(f"Failed to delete processed repo {d}: {e}")
            dirs.remove(d)
            if len(dirs) < 2:
                return

        # If we still have >= 2 directories, we must delete the oldest active repository.
        if len(dirs) >= 2:
            dirs.sort(key=lambda d: repo_data.get(d, {}).get("created_at", datetime.min))
            oldest_dir = dirs[0]
            try:
                shutil.rmtree(os.path.join(UPLOADS_DIR, oldest_dir))
                print(f"Cleaned up oldest active repository directory {oldest_dir} to respect 2-repo limit.")
            except Exception as e:
                print(f"Failed to delete oldest active repo {oldest_dir}: {e}")
            
    except Exception as e:
        print(f"Error during repository cleanup: {e}")
    finally:
        db.close()

def clone_repository(repo_url: str, repo_id: str, branch: str = None) -> str:
    """Clones a Git repository from a URL to a unique folder or switches branch.
    
    Args:
        repo_url: The git clone URL.
        repo_id: The UUID of the repository.
        branch: The target branch to checkout/clone.
        
    Returns:
        The absolute path to the cloned repository.
    """
    cleanup_cloned_repositories(repo_id)
    target_dir = get_repo_dir(repo_id)
    
    # If directory already exists, open it and check if it's correct
    if os.path.exists(target_dir) and os.path.exists(os.path.join(target_dir, ".git")):
        print(f"Repository folder already exists at {target_dir}. Checking out branch...")
        try:
            repo = git.Repo(target_dir)
            repo.git.reset('--hard')
            repo.git.clean('-fd')
            # Fetch updates
            for remote in repo.remotes:
                try:
                    remote.fetch()
                except Exception:
                    pass
            if branch:
                try:
                    repo.git.checkout(branch)
                except Exception:
                    repo.git.checkout('-b', branch, f'origin/{branch}')
            return target_dir
        except Exception as e:
            print(f"Failed to reuse existing folder: {e}. Re-cloning...")
            shutil.rmtree(target_dir)
        
    os.makedirs(target_dir, exist_ok=True)
    
    # Perform git clone using GitPython
    print(f"Cloning {repo_url} into {target_dir}...")
    if branch:
        git.Repo.clone_from(repo_url, target_dir, branch=branch)
    else:
        git.Repo.clone_from(repo_url, target_dir)
    print(f"Successfully cloned {repo_url}.")
    
    return target_dir
