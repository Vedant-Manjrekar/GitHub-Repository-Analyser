import time
import os
from fastapi import Request, HTTPException, status
from collections import defaultdict
import threading

# Simple thread-safe in-memory rate limiter
class InMemoryRateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = threading.Lock()

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> bool:
        current_time = time.time()
        with self.lock:
            # Filter requests in the window
            self.requests[key] = [t for t in self.requests[key] if current_time - t < window_seconds]
            if len(self.requests[key]) >= max_requests:
                return False
            self.requests[key].append(current_time)
            return True

# Initialize a global rate limiter instance
_limiter = InMemoryRateLimiter()

def rate_limit(max_requests: int = 5, window_seconds: int = 60):
    """
    Dependency to rate limit endpoints.
    Enforces limit per IP address.
    """
    def dependency(request: Request):
        if os.getenv("ENV") == "testing":
            return
        # Retrieve client IP, fallback to header or local
        ip = request.client.host if request.client else "127.0.0.1"
        # Combine IP and path to keep limits endpoint-specific
        key = f"{ip}:{request.url.path}"
        
        # Check limit
        if not _limiter.check_rate_limit(key, max_requests, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts. Please try again later."
            )
    return dependency
