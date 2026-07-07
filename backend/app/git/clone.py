import os
import zipfile
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

def clone_repository(repo_url: str, repo_id: str, branch: str = None) -> str:
    """Clones a Git repository from a URL to a unique folder or switches branch.
    
    Args:
        repo_url: The git clone URL.
        repo_id: The UUID of the repository.
        branch: The target branch to checkout/clone.
        
    Returns:
        The absolute path to the cloned repository.
    """
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

def extract_zip_repository(zip_file_path: str, repo_id: str) -> str:
    """Extracts a ZIP file containing a Git repository.
    
    Args:
        zip_file_path: Absolute path to the uploaded ZIP file.
        repo_id: The UUID of the repository.
        
    Returns:
        The absolute path to the root of the extracted repository.
    """
    target_dir = get_repo_dir(repo_id)
    
    # Clear directory if it exists
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
        
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"Extracting zip {zip_file_path} to {target_dir}...")
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(target_dir)
        
    # Standard GitHub zip downloads contain a single top-level folder
    # Let's inspect the directory and flatten it if it contains exactly one subdirectory.
    contents = os.listdir(target_dir)
    if len(contents) == 1:
        single_item_path = os.path.join(target_dir, contents[0])
        if os.path.isdir(single_item_path):
            # Move all contents of the subdirectory up one level
            for item in os.listdir(single_item_path):
                shutil.move(os.path.join(single_item_path, item), target_dir)
            # Remove the now empty subdirectory
            os.rmdir(single_item_path)
            
    print(f"Successfully extracted repository to {target_dir}.")
    return target_dir
