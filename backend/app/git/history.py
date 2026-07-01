import git
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Any

def get_git_history(repo_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """Parses a Git repository's history to extract commits, contributors, and file churn metrics.
    
    Args:
        repo_path: Absolute path to the repository directory.
        
    Returns:
        A tuple of:
          - commits: List of dictionaries containing commit metadata.
          - contributors: Dict mapping contributor email to author metrics (name, email, commit_count).
          - file_churn: Dict mapping file paths to churn metrics (churn_count, additions, deletions, owner).
    """
    repo = git.Repo(repo_path)
    
    # Check if repository has any commits (is not empty)
    if not repo.head.is_valid():
        return [], {}, {}
        
    commits_list = []
    contributors_map = {}
    file_churn_map = {}
    
    # To determine ownership, we track the amount of line modifications (additions + deletions)
    # per contributor per file path: file_path -> { contributor_email -> line_modifications }
    file_author_lines = {}
    
    print(f"Crawling Git history for {repo_path}...")
    
    # Iterate through all commits on the default branch in reverse chronological order (newest first)
    for commit in repo.iter_commits():
        author_name = commit.author.name or "Unknown"
        author_email = commit.author.email or "unknown@email.com"
        commit_date = datetime.fromtimestamp(commit.committed_date, timezone.utc)
        
        # Get commit stats
        # Note: commit.stats can be slow on large repositories, but provides precise insertions/deletions per file
        try:
            commit_stats = commit.stats
            total_stats = commit_stats.total
            additions = total_stats.get("insertions", 0)
            deletions = total_stats.get("deletions", 0)
            files_stats = commit_stats.files
        except Exception as e:
            # Fallback if stats can't be read
            additions = 0
            deletions = 0
            files_stats = {}
            print(f"Warning: Could not read stats for commit {commit.hexsha}: {e}")
            
        commits_list.append({
            "hash": commit.hexsha,
            "author": f"{author_name} <{author_email}>",
            "date": commit_date,
            "additions": additions,
            "deletions": deletions
        })
        
        # Update contributor aggregates
        if author_email not in contributors_map:
            contributors_map[author_email] = {
                "name": author_name,
                "email": author_email,
                "commits": 0
            }
        contributors_map[author_email]["commits"] += 1
        
        # Track file churn and author line changes
        for filepath, stats in files_stats.items():
            file_add = stats.get("insertions", 0)
            file_del = stats.get("deletions", 0)
            line_mods = file_add + file_del
            
            if filepath not in file_churn_map:
                file_churn_map[filepath] = {
                    "churn_count": 0,
                    "additions": 0,
                    "deletions": 0
                }
            file_churn_map[filepath]["churn_count"] += 1
            file_churn_map[filepath]["additions"] += file_add
            file_churn_map[filepath]["deletions"] += file_del
            
            # Track modifications per author for ownership
            if filepath not in file_author_lines:
                file_author_lines[filepath] = {}
            file_author_lines[filepath][author_email] = file_author_lines[filepath].get(author_email, 0) + line_mods
            
    # Calculate file owners (the contributor with the most line modifications in that file)
    for filepath, churn_data in file_churn_map.items():
        author_mods = file_author_lines.get(filepath, {})
        if author_mods:
            # Find author email with maximum modifications
            owner_email = max(author_mods, key=author_mods.get)
            owner_name = contributors_map.get(owner_email, {}).get("name", owner_email)
            churn_data["owner"] = f"{owner_name} <{owner_email}>"
        else:
            churn_data["owner"] = "Unknown"
            
    print(f"Git history crawl complete. Extracted {len(commits_list)} commits and {len(contributors_map)} contributors.")
    
    return commits_list, contributors_map, file_churn_map
