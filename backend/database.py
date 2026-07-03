"""
database.py — MongoDB connection and collection setup via Motor (async).

Collection: researches
Schema:
  _id         : ObjectId
  userId      : str          – Clerk user sub (from JWT)
  userEmail   : str          – user email
  topic       : str          – research topic as entered
  createdAt   : datetime     – UTC timestamp of completion
  score       : int          – critic score 0-10 (0 if not found)
  status      : str          – "completed" | "failed"
  result      : dict
    report          : str
    feedback        : str
    search_results  : str
    scraped_content : str
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os
import logging

logger = logging.getLogger(__name__)

# Explicitly load the root .env (one level up from this file's directory).
# Using load_dotenv() without a path is unreliable when uvicorn is launched
# from the backend/ subdirectory on Windows.
_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ROOT_ENV, override=True)

MONGODB_URL = os.getenv("MONGODB_URL")

if not MONGODB_URL:
    raise ValueError("MONGODB_URL is not set in the environment or .env file.")

# Clean up any accidental spaces or hidden quotes
MONGODB_URL = MONGODB_URL.strip().strip("'").strip('"')

# The actual database name in MongoDB Atlas (case-sensitive — must match exactly)
DB_NAME = "Cluster0"

import certifi

client = AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
db = client[DB_NAME]

researches = db["researches"]


async def create_indexes() -> None:
    """
    Create indexes on startup.
    Each index creation is wrapped individually so one failure
    does not prevent the others from being created or the server from starting.
    """
    # Primary access pattern: fetch a user's history sorted by newest first
    try:
        await researches.create_index(
            [("userId", 1), ("createdAt", -1)],
            name="userId_createdAt",
        )
        logger.info("Index 'userId_createdAt' ready.")
    except Exception as e:
        logger.warning(f"Could not create compound index: {e}")

    # Text index on topic — used for future search-your-history feature
    try:
        await researches.create_index(
            [("topic", "text")],
            name="topic_text",
        )
        logger.info("Index 'topic_text' ready.")
    except Exception as e:
        # Text index conflicts are common if Atlas already has one — safe to ignore
        logger.warning(f"Could not create text index (may already exist): {e}")