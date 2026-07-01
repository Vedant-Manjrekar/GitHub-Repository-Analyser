import math
from typing import List, Dict, Any

def calculate_hotspot_scores(files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calculates a hotspot score (0-100) for each file by combining complexity and churn.
    
    Uses logarithmic normalization to handle outliers (power-law distributions) and prevent
    a single massive file or high-churn file from compressing all other scores.
    
    Args:
        files: List of file dictionaries, each containing:
          - 'path': File path
          - 'complexity': Cyclomatic complexity or LOC
          - 'churn': Churn count (number of modifications)
          
    Returns:
        The input list of file dictionaries updated with a 'hotspot_score' key.
    """
    if not files:
        return []
        
    # Find the maximum complexity and churn values across the repository
    max_complexity = max(f.get("complexity", 0.0) for f in files)
    max_churn = max(f.get("churn", 0) for f in files)
    
    # Calculate log bases
    log_max_complexity = math.log1p(max_complexity) if max_complexity > 0 else 0
    log_max_churn = math.log1p(max_churn) if max_churn > 0 else 0
    
    updated_files = []
    for f in files:
        complexity = f.get("complexity", 0.0)
        churn = f.get("churn", 0)
        
        # Calculate logarithmic normalizations (0.0 to 1.0)
        norm_complexity = (math.log1p(complexity) / log_max_complexity) if log_max_complexity > 0 else 0.0
        norm_churn = (math.log1p(churn) / log_max_churn) if log_max_churn > 0 else 0.0
        
        # Combined score: 50% complexity weight, 50% churn weight
        # Scale to 0-100 range
        hotspot_score = (norm_complexity * 0.5 + norm_churn * 0.5) * 100
        
        # Create a new copy to avoid mutating the database object directly during calculation
        updated_file = dict(f)
        updated_file["hotspot_score"] = round(hotspot_score, 2)
        updated_files.append(updated_file)
        
    return updated_files
