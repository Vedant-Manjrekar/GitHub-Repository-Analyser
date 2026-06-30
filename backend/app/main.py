from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on server startup
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization failed: {e}")
    yield

app = FastAPI(
    title="Git Repository Analytics API", 
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Git Repository Analytics API"}
