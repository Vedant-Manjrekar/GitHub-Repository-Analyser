from typing import List, Dict, Any

def analyze_contributor_metrics(contributors_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Analyzes contributors to calculate codebase knowledge concentration and risk alerts.
    
    Args:
        contributors_map: Map of contributor email -> {name, email, commits}.
        
    Returns:
        A dictionary containing:
          - contributors: List of contributors with percentage shares.
          - knowledge_concentration: Percentage (0-100) indicating top contributor dominance.
          - risk_level: 'low', 'medium', or 'high' based on dependency.
          - message: Actionable warning about single-developer dependency if applicable.
    """
    if not contributors_map:
        return {
            "contributors": [],
            "knowledge_concentration": 0.0,
            "risk_level": "low",
            "message": "No contributors found."
        }
        
    total_commits = sum(c["commits"] for c in contributors_map.values())
    
    # Calculate shares
    contributor_list = []
    for email, data in contributors_map.items():
        commits = data["commits"]
        share = (commits / total_commits * 100) if total_commits > 0 else 0.0
        contributor_list.append({
            "name": data["name"],
            "email": data["email"],
            "commits": commits,
            "share": round(share, 2)
        })
        
    # Sort by commit count descending
    contributor_list.sort(key=lambda x: x["commits"], reverse=True)
    
    # Calculate knowledge concentration based on the top contributor's share
    top_share = contributor_list[0]["share"] if contributor_list else 0.0
    
    # Determine risk level based on the top developer's share
    if len(contributor_list) == 1:
        risk_level = "high"
        message = "Single contributor project. High vulnerability if this contributor becomes unavailable."
    elif top_share >= 80.0:
        risk_level = "high"
        message = f"Critical dependency on {contributor_list[0]['name']} ({top_share}% of work). High bus factor risk."
    elif top_share >= 50.0:
        risk_level = "medium"
        message = f"High dependency on {contributor_list[0]['name']} ({top_share}% of work)."
    else:
        risk_level = "low"
        message = "Healthy distribution of work across contributors."
        
    return {
        "contributors": contributor_list,
        "knowledge_concentration": round(top_share, 2),
        "risk_level": risk_level,
        "message": message
    }
