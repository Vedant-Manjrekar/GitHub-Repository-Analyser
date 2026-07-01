from typing import List, Dict, Any
from datetime import datetime

def calculate_churn_trends(commits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Aggregates commit statistics chronologically by month to generate churn trend charts.
    
    Args:
        commits: List of commit dictionaries, containing 'date', 'additions', and 'deletions'.
        
    Returns:
        A sorted list of trend dictionaries, containing:
          - date: String formatted as "YYYY-MM"
          - commits: Total number of commits in that month.
          - additions: Total lines added in that month.
          - deletions: Total lines deleted in that month.
    """
    monthly_stats = {}
    
    for commit in commits:
        commit_date = commit["date"]
        # Group by Year-Month
        month_key = commit_date.strftime("%Y-%m")
        
        if month_key not in monthly_stats:
            monthly_stats[month_key] = {
                "date": month_key,
                "commits": 0,
                "additions": 0,
                "deletions": 0
            }
            
        monthly_stats[month_key]["commits"] += 1
        monthly_stats[month_key]["additions"] += commit.get("additions", 0)
        monthly_stats[month_key]["deletions"] += commit.get("deletions", 0)
        
    # Sort chronologically by the month key
    sorted_months = sorted(monthly_stats.keys())
    return [monthly_stats[m] for m in sorted_months]
