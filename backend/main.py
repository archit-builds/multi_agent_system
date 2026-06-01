from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
import asyncio
import json
import re

from pipeline import run_research_pipeline_stream
from database import researches, create_indexes
from auth import get_current_user

app = FastAPI(
    title="Multi-Agent Research API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await create_indexes()


class ResearchRequest(BaseModel):
    topic: str


def extract_score(feedback: str) -> int:
    match = re.search(r"Score:\s*(\d+)/10", feedback)
    return int(match.group(1)) if match else 0


# ── Public endpoints ──────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Research Pipeline API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/research/stream")
async def research_stream(
    request: ResearchRequest,
    user: dict | None = Depends(get_current_user)
):
    """
    Streams pipeline as SSE.
    Works for guests too — if user is logged in, saves to MongoDB at the end.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    async def event_generator():
        state = {}
        try:
            async for event in run_research_pipeline_stream(request.topic):
                # Collect state as pipeline runs
                step = event.get("step")
                if step in ("search_results", "scraped_content", "report", "feedback"):
                    state[step] = event.get("data", "")

                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0)

            # If logged in — save to MongoDB after pipeline completes
            if user and state.get("report"):
                score = extract_score(state.get("feedback", ""))
                doc = {
                    "userId":    user["userId"],
                    "userEmail": user["email"],
                    "topic":     request.topic,
                    "createdAt": datetime.now(timezone.utc),
                    "score":     score,
                    "status":    "completed",
                    "result":    state,
                }
                result = await researches.insert_one(doc)
                saved_event = {
                    "step": "saved",
                    "data": str(result.inserted_id),
                    "message": "Research saved to history"
                }
                yield f"data: {json.dumps(saved_event)}\n\n"

        except Exception as e:
            error_event = {"step": "error", "data": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Protected endpoints ───────────────────────────────────────────

@app.get("/api/history")
async def get_history(user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    cursor = researches.find(
        {"userId": user["userId"]},
        {"result": 0}  # exclude heavy result field from list
    ).sort("createdAt", -1).limit(20)

    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)

    return {"history": history}


@app.get("/api/history/{research_id}")
async def get_research(research_id: str, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    from bson import ObjectId
    doc = await researches.find_one({
        "_id": ObjectId(research_id),
        "userId": user["userId"]  # ensure user owns this research
    })

    if not doc:
        raise HTTPException(status_code=404, detail="Research not found")

    doc["_id"] = str(doc["_id"])
    return doc


@app.delete("/api/history/{research_id}")
async def delete_research(research_id: str, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    from bson import ObjectId
    result = await researches.delete_one({
        "_id": ObjectId(research_id),
        "userId": user["userId"]
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Research not found")

    return {"message": "Deleted successfully"}