import os
import tempfile
import pytest
from app.analyzers.complexity import analyze_file_complexity
from app.analyzers.hotspots import calculate_hotspot_scores
from app.analyzers.bus_factor import calculate_bus_factor
from app.analyzers.contributors import analyze_contributor_metrics
from app.analyzers.debt import calculate_technical_debt, count_todo_tags

def test_lizard_complexity_and_fallback():
    # Create a temporary directory and code file
    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Test supported language file (Python)
        code_file = os.path.join(tmpdir, "code.py")
        with open(code_file, "w") as f:
            f.write("def func_a(x):\n    if x > 10:\n        return x\n    return 0\n")
            
        metrics = analyze_file_complexity(code_file)
        assert metrics["loc"] > 0
        assert metrics["function_count"] == 1
        assert metrics["average_complexity"] >= 2.0  # function has an if branch, so complexity >= 2
        
        # 2. Test fallback physical line count for unsupported/text files
        txt_file = os.path.join(tmpdir, "readme.txt")
        with open(txt_file, "w") as f:
            f.write("Line 1\nLine 2\nLine 3\n")
            
        metrics_txt = analyze_file_complexity(txt_file)
        assert metrics_txt["loc"] == 3
        assert metrics_txt["average_complexity"] == 1.0  # fallback flat complexity

def test_hotspot_logarithmic_scoring():
    files = [
        {"path": "a.py", "complexity": 100, "churn": 100},
        {"path": "b.py", "complexity": 10, "churn": 10},
        {"path": "c.py", "complexity": 1, "churn": 1}
    ]
    results = calculate_hotspot_scores(files)
    
    assert len(results) == 3
    # Sort by hotspot score descending
    results.sort(key=lambda x: x["hotspot_score"], reverse=True)
    
    # Top file should be the maximum complex/churn file (hotspot score = 100)
    assert results[0]["path"] == "a.py"
    assert results[0]["hotspot_score"] == 100.0
    
    # Check that scores are ordered appropriately
    assert results[1]["hotspot_score"] < 100.0
    assert results[2]["hotspot_score"] < results[1]["hotspot_score"]

def test_bus_factor_greedy_coverage():
    # Case A: Empty repository
    assert calculate_bus_factor([]) == 0.0
    
    # Case B: 1 dominant author (owns 8 files out of 10)
    files_dominant = [
        {"path": f"file_{i}.py", "owner": "Alice <alice@email.com>"} for i in range(8)
    ] + [
        {"path": "file_8.py", "owner": "Bob <bob@email.com>"},
        {"path": "file_9.py", "owner": "Charlie <charlie@email.com>"}
    ]
    # Alice owns 80%, B and C own 10% each. If Alice leaves, 80% is orphaned (>50%).
    # So Alice alone constitutes the departing set (size = 1).
    assert calculate_bus_factor(files_dominant) == 1.0
    
    # Case C: Uniform ownership (4 developers owning 25% of files each)
    files_uniform = (
        [{"path": f"f_{i}.py", "owner": "A <a@email.com>"} for i in range(25)] +
        [{"path": f"g_{i}.py", "owner": "B <b@email.com>"} for i in range(25)] +
        [{"path": f"h_{i}.py", "owner": "C <c@email.com>"} for i in range(25)] +
        [{"path": f"i_{i}.py", "owner": "D <d@email.com>"} for i in range(25)]
    )
    # Total files = 100. Departure of A covers 25 files (<=50%). Adding B covers 50 files (<=50%).
    # Adding C covers 75 files (>50%). So 3 developers must leave to orphan >50% of the repository.
    assert calculate_bus_factor(files_uniform) == 3.0

def test_contributor_concentration_and_alerts():
    # Single contributor project
    contribs_single = {
        "alice@email.com": {"name": "Alice", "email": "alice@email.com", "commits": 10}
    }
    metrics = analyze_contributor_metrics(contribs_single)
    assert metrics["risk_level"] == "high"
    assert "Single contributor" in metrics["message"]
    assert metrics["knowledge_concentration"] == 100.0
    
    # Balanced contribution (50% each is categorized as medium risk in our logic threshold)
    contribs_balanced = {
        "alice@email.com": {"name": "Alice", "email": "alice@email.com", "commits": 5},
        "bob@email.com": {"name": "Bob", "email": "bob@email.com", "commits": 5}
    }
    metrics_bal = analyze_contributor_metrics(contribs_balanced)
    assert metrics_bal["risk_level"] == "medium"
    assert metrics_bal["knowledge_concentration"] == 50.0

def test_todo_tags_and_tech_debt():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a source file with debt tags
        file_path = os.path.join(tmpdir, "smell.py")
        with open(file_path, "w") as f:
            f.write("# TODO: fix loop efficiency\n# FIXME: bug in parser\n# HACK: fast fallback\n# normal comment\n")
            
        # Verify tag scanner counts correctly
        tags_count = count_todo_tags(file_path)
        assert tags_count == 3
        
        # Test aggregate tech debt score
        files_payload = [
            {"path": "smell.py", "complexity": 10.0, "churn": 5, "loc": 600, "owner": "Alice"}
        ]
        # In this mock: average complexity is 10.0 (high), the single file has LOC > 500 (large),
        # single contributor maintains it (single owner risk = 100%).
        debt = calculate_technical_debt(tmpdir, files_payload)
        
        assert debt["large_files_count"] == 1
        assert debt["total_todos"] == 3
        assert debt["single_owner_count"] == 0  # churn = 5 > 2
        assert debt["technical_debt"] > 0.0
        assert debt["health_score"] == 100.0 - debt["technical_debt"]
