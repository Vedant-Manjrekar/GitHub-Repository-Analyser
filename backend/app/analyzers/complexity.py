import os
import lizard
from typing import Dict, Any

def analyze_file_complexity(file_path: str) -> Dict[str, Any]:
    """Analyzes a source file to compute lines of code and cyclomatic complexity.
    
    Args:
        file_path: Absolute path to the file on disk.
        
    Returns:
        A dictionary containing:
          - loc: Lines of code (NLOC).
          - average_complexity: Average cyclomatic complexity across functions.
          - max_complexity: Maximum cyclomatic complexity in a single function.
          - function_count: Number of functions detected.
    """
    # Default values for files that cannot be parsed by Lizard (e.g., config, markdown, unknown binaries)
    result = {
        "loc": 0,
        "average_complexity": 1.0,
        "max_complexity": 1.0,
        "function_count": 0
    }
    
    if not os.path.exists(file_path) or os.path.isdir(file_path):
        return result
        
    # Get physical line count as fallback
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            result["loc"] = sum(1 for _ in f)
    except Exception:
        # If we can't read the file, it might be a binary file; return 0 loc
        return result

    # Compute cyclomatic complexity using Lizard
    try:
        analysis = lizard.analyze_file(file_path)
        
        # Override loc with nloc (non-comment lines of code) if lizard succeeded
        if hasattr(analysis, "nloc") and analysis.nloc is not None:
            result["loc"] = analysis.nloc
            
        result["function_count"] = len(analysis.function_list)
        
        # Extract complexity metrics
        if analysis.function_list:
            complexities = [f.cyclomatic_complexity for f in analysis.function_list]
            result["average_complexity"] = sum(complexities) / len(complexities)
            result["max_complexity"] = max(complexities)
        else:
            # If no functions are defined, complexity is flat (1.0)
            result["average_complexity"] = 1.0
            result["max_complexity"] = 1.0
            
    except Exception as e:
        # Lizard parsing failed, fall back to physical lines and basic complexity
        print(f"Warning: Lizard parsing failed for {file_path}: {e}")
        
    return result
