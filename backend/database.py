from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = "cluster0"

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

researches = db["researches"]

async def create_indexes():
    await researches.create_index([("userId", 1), ("createdAt", -1)])