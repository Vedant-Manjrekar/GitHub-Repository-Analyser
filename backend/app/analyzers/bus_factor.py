from typing import List, Dict, Any

def calculate_bus_factor(files: List[Dict[str, Any]]) -> float:
    """Calculates the project Bus Factor using a greedy file ownership coverage algorithm.
    
    The Bus Factor is defined as the minimum number of key developers whose departure 
    would leave more than 50% of the files in the repository without an owner.
    
    Args:
        files: List of file dictionaries, each containing:
          - 'path': File path
          - 'owner': Owner string (name or email, e.g. "Author <email>")
          
    Returns:
        The computed Bus Factor (float, rounded to nearest integer but returned as float/int).
    """
    if not files:
        return 0.0
        
    # Count how many files each developer owns
    ownership_counts = {}
    total_files = len(files)
    
    for f in files:
        owner = f.get("owner")
        if not owner or owner == "Unknown":
            continue
        ownership_counts[owner] = ownership_counts.get(owner, 0) + 1
        
    if not ownership_counts:
        return 1.0  # If no files have a known owner but files exist, default to 1
        
    # Sort developers by the number of files they own in descending order
    sorted_owners = sorted(ownership_counts.items(), key=lambda x: x[1], reverse=True)
    
    departed_count = 0
    files_affected = 0
    target_threshold = total_files * 0.5  # 50% of files
    
    for owner, count in sorted_owners:
        files_affected += count
        departed_count += 1
        
        # If the departing set owns more than 50% of the codebase, we've found the bus factor
        if files_affected > target_threshold:
            break
            
    # Bus factor is at least 1 if there are files and developers
    return float(max(departed_count, 1))
