import os
import tempfile
import pytest
from app.git.parser import is_binary_file, scan_repository_files, SUPPORTED_EXTENSIONS
from app.database import SessionLocal
from app.models import Repository, File

def test_is_binary_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Standard text file
        txt_path = os.path.join(tmpdir, "doc.txt")
        with open(txt_path, "wb") as f:
            f.write(b"Hello world, this is plain text.\nLine 2.\n")
        assert not is_binary_file(txt_path)
        
        # 2. Binary file with NUL byte in the first 4KB
        bin_path = os.path.join(tmpdir, "logo.png")
        with open(bin_path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10")
        assert is_binary_file(bin_path)
        
        # 3. Text file with extension .py containing normal code
        py_path = os.path.join(tmpdir, "script.py")
        with open(py_path, "wb") as f:
            f.write(b"print('hello')\n")
        assert not is_binary_file(py_path)

def test_scan_repository_files_filtering():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create standard source file
        os.makedirs(os.path.join(tmpdir, "src"), exist_ok=True)
        py_file = os.path.join(tmpdir, "src", "main.py")
        with open(py_file, "w") as f:
            f.write("print('source')")
            
        # Create binary files (png and jar)
        png_file = os.path.join(tmpdir, "logo.png")
        with open(png_file, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10") # Contains NUL
            
        jar_file = os.path.join(tmpdir, "app.jar")
        with open(jar_file, "wb") as f:
            f.write(b"PK\x03\x04\x14\x00\x08\x00\x08\x00\x00\x00\x00\x00") # ZIP/JAR header can contain NUL
            
        # Create unsupported files (e.g. .mp4, .pdf)
        mp4_file = os.path.join(tmpdir, "video.mp4")
        with open(mp4_file, "w") as f:
            f.write("text content but wrong extension")
            
        rel_files, language_counts, primary_language = scan_repository_files(tmpdir)
        
        # main.py should be included
        assert "src/main.py" in rel_files
        
        # binary files (logo.png, app.jar) should be skipped
        assert "logo.png" not in rel_files
        assert "app.jar" not in rel_files
        
        # non-supported extension (video.mp4) should be skipped
        assert "video.mp4" not in rel_files

def test_database_nul_byte_defensive_sanitization():
    db = SessionLocal()
    try:
        # Create a temp repository record
        repo = Repository(
            name="test_nul_sanitization",
            repo_url="https://github.com/dummy/repo.git",
            status="pending"
        )
        db.add(repo)
        db.commit()
        
        # Add a File containing a NUL byte in path or content
        # Note: PostgreSQL normally crashes with NUL bytes in string parameters.
        # Our before_commit hook should intercept this and replace "\x00" with "".
        bad_file = File(
            repository_id=repo.id,
            path="src/bad\x00path.py",
            language="Python",
            content="print('bad\x00content')"
        )
        db.add(bad_file)
        db.commit() # Should succeed because event listener sanitizes
        
        # Query it back and assert it got sanitized
        db.refresh(bad_file)
        assert "\x00" not in bad_file.path
        assert bad_file.path == "src/badpath.py"
        assert "\x00" not in bad_file.content
        assert bad_file.content == "print('badcontent')"
        
        # Clean up
        db.delete(bad_file)
        db.delete(repo)
        db.commit()
        
    finally:
        db.close()
