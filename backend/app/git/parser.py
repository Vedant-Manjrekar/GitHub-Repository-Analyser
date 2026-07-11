import os
from typing import Dict, List, Set, Tuple

# Set of standard directories and files to exclude from codebase analysis
EXCLUDE_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "env",
    ".env",
    "__pycache__",
    "dist",
    "build",
    "target",
    "bin",
    "obj",
    "out",
    "coverage",
    ".next",
    ".idea",
    ".vscode",
}

EXCLUDE_FILES: Set[str] = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "Cargo.lock",
    ".DS_Store",
}

# Mapping of file extensions to programming languages
EXTENSION_MAP: Dict[str, str] = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".kt": "Kotlin",
    ".c": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".h": "C/C++ Header",
    ".cs": "C#",
    ".swift": "Swift",
    ".rb": "Ruby",
    ".php": "PHP",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "CSS",
    ".sh": "Shell",
    ".bat": "Batch",
    ".sql": "SQL",
    ".md": "Markdown",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".xml": "XML",
}

SUPPORTED_EXTENSIONS: Set[str] = {
    ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".kt", ".go", 
    ".cpp", ".c", ".h", ".cs", ".php", ".rb", ".swift", ".rs", 
    ".scala", ".sql", ".html", ".css", ".scss", ".json", ".yaml", 
    ".yml", ".xml", ".md"
}

def is_binary_file(file_path: str) -> bool:
    """Helper to detect if a file is binary by looking for NUL bytes in the first 4KB."""
    if not os.path.exists(file_path) or os.path.isdir(file_path):
        return False
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(4096)
            return b'\x00' in chunk
    except Exception:
        return True # Treat as binary if we can't read it

def detect_language(file_path: str) -> str:
    """Detects the programming language of a file based on its extension."""
    _, ext = os.path.splitext(file_path.lower())
    return EXTENSION_MAP.get(ext, "Unknown")

def should_ignore(path: str, base_path: str) -> bool:
    """Determines whether a file or directory should be ignored during parsing."""
    rel_path = os.path.relpath(path, base_path)
    parts = rel_path.split(os.sep)
    
    # Check if any part of the path is in the exclude set
    for part in parts:
        if part in EXCLUDE_DIRS or part in EXCLUDE_FILES:
            return True
            
    # Ignore hidden files/folders (except .github, etc., if needed, but general ignore is safe)
    basename = os.path.basename(path)
    if basename.startswith(".") and basename not in [".github"]:
        return True
        
    return False

def scan_repository_files(repo_path: str) -> Tuple[List[str], Dict[str, int], str]:
    """Scans the repository folder to find valid files and compile language statistics.
    
    Args:
        repo_path: Absolute path to the repository root.
        
    Returns:
        A tuple of:
          - file_paths: List of absolute paths to files that should be analyzed.
          - language_counts: Dict mapping language names to file count.
          - primary_language: The name of the most common language in the repository.
    """
    valid_files = []
    language_counts = {}
    
    # Walk the directory tree
    for root, dirs, files in os.walk(repo_path):
        # Modify dirs in-place to skip walking ignored directories (improves speed)
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        
        for file in files:
            if file in EXCLUDE_FILES or file.startswith("."):
                continue
                
            abs_path = os.path.join(root, file)
            
            # Additional path-based exclude check
            if should_ignore(abs_path, repo_path):
                continue
                
            # Filter by extension allowlist
            _, ext = os.path.splitext(file.lower())
            if ext not in SUPPORTED_EXTENSIONS:
                continue
                
            # Filter binary files
            if is_binary_file(abs_path):
                rel_path = os.path.relpath(abs_path, repo_path)
                print(f"Skipping binary file: {rel_path}")
                continue
                
            valid_files.append(abs_path)
            
            # Track language statistics
            lang = detect_language(file)
            # Only track known languages or source/config files (ignore completely "Unknown" formats to avoid skewing)
            if lang != "Unknown":
                language_counts[lang] = language_counts.get(lang, 0) + 1

    # Determine primary language
    if language_counts:
        primary_language = max(language_counts, key=language_counts.get)
    else:
        primary_language = "Unknown"
        
    # Return relative paths (or absolute, but relative is easier for db storage)
    rel_files = [os.path.relpath(f, repo_path) for f in valid_files]
    
    print(f"Scanned repository. Found {len(rel_files)} files. Primary language: {primary_language}.")
    return rel_files, language_counts, primary_language
