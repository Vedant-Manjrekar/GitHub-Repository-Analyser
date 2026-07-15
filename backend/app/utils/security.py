import secrets
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Initialize Argon2id password hasher with secure parameters
# Type Argon2id (Argon2Type.ID = 2, which is default for argon2-cffi PasswordHasher)
ph = PasswordHasher(
    time_cost=3,      # number of iterations
    memory_cost=65536, # memory usage in KiB (64 MiB)
    parallelism=4,    # number of parallel threads
    hash_len=32,      # length of hash key
    salt_len=16       # salt size
)

def get_password_hash(password: str) -> str:
    """Hashes a password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False

def generate_secure_token() -> str:
    """Generates a secure, URL-safe random token (e.g. for reset/verification)."""
    return secrets.token_urlsafe(32)
