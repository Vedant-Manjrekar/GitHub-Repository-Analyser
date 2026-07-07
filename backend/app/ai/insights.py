import os
from openai import OpenAI
from typing import Dict, Any, List

def generate_fallback_insights(repo_name: str, metrics: Dict[str, Any]) -> str:
    """Generates a structured, metric-driven fallback markdown review of the repository.
    
    This is used when the OpenAI API key is missing or the external call fails.
    """
    health = metrics.get("health_score", 100.0)
    bus_factor = metrics.get("bus_factor", 0)
    tech_debt = metrics.get("technical_debt", 0.0)
    primary_lang = metrics.get("primary_language", "Unknown")
    
    hotspots: List[Dict[str, Any]] = metrics.get("hotspots", [])
    contributors: List[Dict[str, Any]] = metrics.get("contributors", [])
    large_files_count = metrics.get("large_files_count", 0)
    total_todos = metrics.get("total_todos", 0)
    
    # Format health grade
    if health >= 90:
        grade = "A"
        grade_desc = "Excellent Code Health"
    elif health >= 80:
        grade = "B"
        grade_desc = "Good Code Health (Minor technical debt)"
    elif health >= 65:
        grade = "C"
        grade_desc = "Moderate Code Health (Refactoring recommended)"
    elif health >= 50:
        grade = "D"
        grade_desc = "Low Code Health (Significant engineering risks)"
    else:
        grade = "F"
        grade_desc = "Critical Code Health (Immediate attention required)"

    markdown = f"""# Codebase Ingestion Summary: {repo_name}

> [!NOTE]
> This review was compiled dynamically using code metrics engines.

---

## 📊 Core Health Indices
* **Repository Health Score**: `{health}/100` (Grade **{grade}** - *{grade_desc}*)
* **Technical Debt Ratio**: `{tech_debt}%`
* **Project Bus Factor**: `{int(bus_factor)}` contributor(s)
* **Primary Language**: `{primary_lang}`

---

## 🚨 Critical Engineering Risks

### 1. Codebase Maintainability (Technical Debt)
* **Large Files**: There are `{large_files_count}` files exceeding 500 lines of code. These files represent potential monolithic structures that make readability and testability challenging.
* **Code Smells (Comment Tags)**: Detected `{total_todos}` code debt tags (`TODO`/`FIXME`/`HACK`) remaining in the codebase.

### 2. Contributor Dependency (Bus Factor)
"""

    if bus_factor <= 1.0:
        markdown += f"""* **Warning (Bus Factor = 1)**: The project has a bus factor of **1**. A single contributor owns more than 50% of the repository's files. The project faces high operational vulnerability if this developer departs.
"""
    elif bus_factor <= 2.0:
        markdown += f"""* **Caution (Bus Factor = 2)**: The project has a bus factor of **2**. Core codebase knowledge is highly concentrated in only two contributors.
"""
    else:
        markdown += f"""* **Healthy**: Core codebase ownership is distributed across `{int(bus_factor)}` developers, representing a lower operational risk.
"""

    # Add Hotspots Breakdown
    if hotspots:
        markdown += """
### 3. Code Hotspots (High Complexity + High Churn)
The following files represent the highest risk. They have high cyclomatic complexity and are modified frequently, making them prone to bugs:
"""
        # Display top 3 hotspots
        for i, f in enumerate(hotspots[:3]):
            path = f.get("path", "")
            comp = f.get("complexity", 1.0)
            churn = f.get("churn", 0)
            score = f.get("hotspot_score", 0.0)
            owner = f.get("owner", "Unknown")
            markdown += f"""* **{path}** (Hotspot Score: `{score:.2f}/100`)
  * *Complexity*: Average cyclomatic complexity/LOC is `{comp:.2f}`.
  * *Change Frequency*: Modified `{churn}` times in git logs.
  * *Primary Owner*: `{owner}`
"""
    else:
        markdown += """
### 3. Code Hotspots
* No significant files combining high complexity and high modifications were flagged.
"""

    # Add Action Plan
    markdown += """
---

## 🛠️ Actionable Refactoring Priorities

1. """
    if hotspots:
        h1 = hotspots[0].get("path", "")
        markdown += f"**Deconstruct Hotspots**: Refactor `{h1}` by separating concerns and creating smaller sub-modules. Reducing its complexity will lower bug rates during active changes."
    else:
        markdown += "**Deconstruct Complex Files**: Analyze files with high lines of code or complexity counts and slice them into helper modules."

    if large_files_count > 0:
        markdown += f"\n2. **Break Down Large Files**: Target the `{large_files_count}` files exceeding 500 lines of code. Standard guidelines recommend keeping file sizes under 300 lines for optimal review cycles."
    else:
        markdown += "\n2. **Standardize Code Styles**: Create linting rules to enforce function length limits and keep code structures modular."

    if total_todos > 0:
        markdown += f"\n3. **Address Outstanding TODOs**: Dedicate a developer cycle to resolve the `{total_todos}` code tags (`TODO`/`FIXME`/`HACK`) that have accumulated in source files."
    else:
        markdown += "\n3. **Write Unit Tests**: Focus on adding unit tests for files with higher change frequencies (churn) to prevent regression issues."

    if bus_factor <= 2.0 and len(contributors) > 1:
        markdown += "\n4. **Share Knowledge**: Conduct peer programming or review sessions to transfer ownership of files owned exclusively by the top developers."
        
    return markdown


def generate_codebase_insights(repo_name: str, metrics: Dict[str, Any]) -> str:
    """Generates an AI summary of repository health and code risks using OpenAI.
    
    Falls back to a detailed rules-based fallback generator if the API key is missing
    or if the request fails.
    
    Args:
        repo_name: Name of the repository.
        metrics: Dictionary containing calculated metrics.
        
    Returns:
        A Markdown string containing the codebase analysis report.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OpenAI API key not found. Using fallback metric insights generator...")
        return generate_fallback_insights(repo_name, metrics)
        
    # Prepare metrics summaries to keep payload tight but highly informative
    health = metrics.get("health_score", 100.0)
    bus_factor = metrics.get("bus_factor", 0)
    tech_debt = metrics.get("technical_debt", 0.0)
    primary_lang = metrics.get("primary_language", "Unknown")
    
    hotspots = metrics.get("hotspots", [])[:5]  # Top 5 hotspots
    contributors = metrics.get("contributors", [])[:5]  # Top 5 contributors
    large_files_count = metrics.get("large_files_count", 0)
    total_todos = metrics.get("total_todos", 0)
    
    # Format a prompt for the model
    prompt = f"""
Analyze the following code metrics for a software repository and write a professional, highly actionable engineering summary.

Repository Name: {repo_name}
Primary Language: {primary_lang}

Calculated Metrics:
- Overall Health Score: {health}/100
- Technical Debt Score: {tech_debt}%
- Bus Factor: {bus_factor}
- Files over 500 lines: {large_files_count}
- Code debt comment tags (TODO/FIXME/HACK/BUG): {total_todos}

Top Code Hotspots (High Churn & High Complexity):
{chr(10).join([f"- Path: {h.get('path')} | Churn: {h.get('churn')} changes | Complexity/LOC: {h.get('complexity')} | Owner: {h.get('owner')} | Hotspot Score: {h.get('hotspot_score')}/100" for h in hotspots])}

Top Contributors by Commit Share:
{chr(10).join([f"- {c.get('name')} <{c.get('email')}> | Share: {c.get('share')}% | Commits: {c.get('commits')}" for c in contributors])}

Please format your response in professional Markdown. Use GitHub-style warnings or callout blocks if applicable. Include the following sections:
1. Core Codebase Health Summary
2. Critical Engineering Risks (analyzing bus factor concentration, tech debt indices, and hotspot files)
3. Actionable Refactoring Roadmap (listing concrete files to refactor and priorities)
4. Maintenance recommendations to prevent further technical debt
"""

    try:
        # Initialize the client
        client = OpenAI(api_key=api_key)
        
        # Request completion
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Highly cost-effective and powerful for text analysis tasks
            messages=[
                {"role": "system", "content": "You are Antigravity AI, a senior staff software engineer and codebase auditor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1500
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"OpenAI API call failed: {e}. Falling back to metric insights generator...")
        return generate_fallback_insights(repo_name, metrics)
