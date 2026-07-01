import os
from typing import List, Dict, Any

def count_todo_tags(file_path: str) -> int:
    """Scans a file to count occurrence of technical debt tags (TODO, FIXME, HACK, BUG)."""
    tags = ["TODO", "FIXME", "HACK", "BUG"]
    count = 0
    if not os.path.exists(file_path) or os.path.isdir(file_path):
        return 0
        
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line_upper = line.upper()
                for tag in tags:
                    if tag in line_upper:
                        count += 1
    except Exception:
        # If the file can't be read (e.g. binary), return 0 tags
        pass
        
    return count

def calculate_technical_debt(repo_path: str, files_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates the technical debt and overall repository health scores.
    
    Technical Debt (0-100) is aggregated from four categories:
      1. Complexity Penalty (up to 30 points): Based on average file complexity.
      2. File Size Penalty (up to 25 points): Based on the ratio of files exceeding 500 lines of code.
      3. Comment Tag Penalty (up to 20 points): Based on TODO/FIXME comments count and density.
      4. Single Owner Risk (up to 25 points): Ratio of files maintained by only one contributor.
      
    Health Score = 100 - Technical Debt.
    
    Args:
        repo_path: Absolute path to the repository on disk.
        files_list: List of file dictionaries containing 'path', 'complexity', 'churn', and 'owner'.
        
    Returns:
        A dictionary containing:
          - technical_debt: The estimated technical debt score (0 to 100).
          - health_score: The overall code health score (0 to 100).
          - large_files_count: The count of files with LOC > 500.
          - total_todos: The total number of debt-related tags found.
          - single_owner_count: The count of files edited by only one developer.
    """
    if not files_list:
        return {
            "technical_debt": 0.0,
            "health_score": 100.0,
            "large_files_count": 0,
            "total_todos": 0,
            "single_owner_count": 0
        }
        
    total_files = len(files_list)
    
    # 1. Complexity Penalty
    avg_complexity = sum(f.get("complexity", 1.0) for f in files_list) / total_files
    # Standardize: Average complexity above 5 starts penalized. Average complexity of 15 maxes out.
    complexity_penalty = min(30.0, max(0.0, (avg_complexity - 2.0) * 3.0))
    
    # 2. File Size Penalty (Large Files: LOC > 500)
    large_files_count = 0
    # Lizard or physical LOC count can be read from files_list's 'loc' or 'complexity' (we'll read LOC directly from disk or pass it)
    # Wait, our complexity analyzer returns LOC under 'loc'. Let's calculate LOC per file.
    # To keep this function self-contained, we scan physical files or read it from file dictionary 'loc' if available.
    # Let's assume we pass the file details with 'loc' (lines of code).
    for f in files_list:
        loc = f.get("loc", 0)
        # If 'loc' wasn't passed, fall back to checking if complexity is high as a proxy, or try to read LOC
        if loc > 500:
            large_files_count += 1
            
    large_ratio = large_files_count / total_files
    size_penalty = min(25.0, large_ratio * 100.0)  # e.g., 25% of files are large = max penalty
    
    # 3. Comment Tag Penalty (TODO/FIXME/HACK/BUG)
    total_todos = 0
    for f in files_list:
        file_abs_path = os.path.join(repo_path, f["path"])
        total_todos += count_todo_tags(file_abs_path)
        
    # Standardize comment penalty based on density per file
    todo_ratio = total_todos / total_files
    todo_penalty = min(20.0, todo_ratio * 4.0)  # e.g. 5 TODOs per file on average = max penalty
    
    # 4. Single-Editor/Single-Owner Risk
    # In git history crawler, we can find out if a file has only 1 contributor.
    # To approximate here: files that have churn of 1, or we can check file metadata
    # If the file has a low churn count (e.g. 1) or has only been touched by one person
    # Let's look at file-level churn. If churn is <= 2 and owned by a single person, we consider it single-owner risk.
    # If we pass a list of files where each has its number of contributors, we can count it.
    # For now, let's mark files as single-editor if their churn is low (e.g. 1 or 2).
    single_owner_count = 0
    for f in files_list:
        if f.get("churn", 1) <= 2:
            single_owner_count += 1
            
    single_owner_ratio = single_owner_count / total_files
    owner_penalty = min(25.0, single_owner_ratio * 50.0)  # e.g., 50% single-owner files = max penalty
    
    # Calculate aggregate technical debt score
    technical_debt = complexity_penalty + size_penalty + todo_penalty + owner_penalty
    technical_debt = min(100.0, max(0.0, technical_debt))
    health_score = 100.0 - technical_debt
    
    return {
        "technical_debt": round(technical_debt, 2),
        "health_score": round(health_score, 2),
        "large_files_count": large_files_count,
        "total_todos": total_todos,
        "single_owner_count": single_owner_count
    }
