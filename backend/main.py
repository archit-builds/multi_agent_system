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

# Credentials (Authorization header) require explicit origins — not "*".
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://multi-agent-system-roan.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await create_indexes()


class ResearchRequest(BaseModel):
    topic: str


def extract_score(feedback: str) -> int:
    """Extract numeric score from critic feedback text, e.g. 'Score: 7/10' → 7."""
    match = re.search(r"Score:\s*(\d+)/10", feedback)
    return int(match.group(1)) if match else 0


async def _save_research(user: dict, topic: str, result: dict, status: str) -> str:
    """
    Persist a completed or failed research to MongoDB.
    Returns the inserted ObjectId as a string.
    """
    score = extract_score(result.get("feedback", "")) if status == "completed" else 0

    doc = {
        "userId":    user["userId"],
        "userEmail": user["email"],
        "topic":     topic.strip(),
        "createdAt": datetime.now(timezone.utc),
        "score":     score,
        "status":    status,          # "completed" | "failed"
        "result": {
            "report":          result.get("report", ""),
            "feedback":        result.get("feedback", ""),
            "search_results":  result.get("search_results", ""),
            "scraped_content": result.get("scraped_content", ""),
        },
    }

    inserted = await researches.insert_one(doc)
    return str(inserted.inserted_id)


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
    user: dict | None = Depends(get_current_user),
):
    """
    Streams the research pipeline as Server-Sent Events (SSE).
    - Works for guests (no token) — pipeline runs but nothing is saved.
    - When signed in, saves the result to MongoDB at the end and emits
      a final { step: "saved", data: "<mongo_id>" } event.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    async def event_generator():
        # Accumulate pipeline output keyed exactly as the schema expects
        result: dict = {
            "report": "",
            "feedback": "",
            "search_results": "",
            "scraped_content": "",
        }
        pipeline_failed = False

        try:
            async for event in run_research_pipeline_stream(request.topic):
                step = event.get("step")

                # Capture each content step into `result`
                if step == "search_results":
                    result["search_results"] = event.get("data", "")
                elif step == "scraped_content":
                    result["scraped_content"] = event.get("data", "")
                elif step == "report":
                    result["report"] = event.get("data", "")
                elif step == "feedback":
                    result["feedback"] = event.get("data", "")
                elif step == "error":
                    pipeline_failed = True

                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0)

        except Exception as e:
            pipeline_failed = True
            error_event = {"step": "error", "data": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

        # ── Persist to MongoDB if user is logged in ──────────────────────────
        if user:
            # Save even on failure so the user can see what went wrong
            status = "failed" if pipeline_failed else "completed"

            # Only save if we have at least a report (skip empty runs)
            if result["report"] or pipeline_failed:
                try:
                    inserted_id = await _save_research(user, request.topic, result, status)
                    saved_event = {
                        "step":    "saved",
                        "data":    inserted_id,
                        "message": "Research saved to history",
                    }
                    yield f"data: {json.dumps(saved_event)}\n\n"
                except Exception as db_err:
                    # Don't crash the stream if DB save fails — just log it
                    db_error_event = {
                        "step":    "db_error",
                        "data":    str(db_err),
                        "message": "Could not save to history",
                    }
                    yield f"data: {json.dumps(db_error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Protected endpoints ───────────────────────────────────────────

@app.get("/api/history")
async def get_history(user: dict = Depends(get_current_user)):
    """Return the 20 most recent research entries for the logged-in user (no result body)."""
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    try:
        cursor = researches.find(
            {"userId": user["userId"]},
            # Exclude heavy result fields from the list view
            {"result.report": 0, "result.scraped_content": 0, "result.search_results": 0},
        ).sort("createdAt", -1).limit(20)

        history = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if isinstance(doc.get("createdAt"), datetime):
                doc["createdAt"] = doc["createdAt"].isoformat()
            history.append(doc)

        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/history/{research_id}")
async def get_research(research_id: str, user: dict = Depends(get_current_user)):
    """Return the full research document including result body."""
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    from bson import ObjectId

    try:
        oid = ObjectId(research_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid research ID")

    try:
        doc = await researches.find_one({
            "_id":    oid,
            "userId": user["userId"],
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not doc:
        raise HTTPException(status_code=404, detail="Research not found")

    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("createdAt"), datetime):
        doc["createdAt"] = doc["createdAt"].isoformat()

    return doc


@app.delete("/api/history/{research_id}")
async def delete_research(research_id: str, user: dict = Depends(get_current_user)):
    """Delete a research entry (only owner can delete)."""
    if not user:
        raise HTTPException(status_code=401, detail="Login required")

    from bson import ObjectId

    try:
        oid = ObjectId(research_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid research ID")

    try:
        result = await researches.delete_one({
            "_id":    oid,
            "userId": user["userId"],
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Research not found")

    return {"message": "Deleted successfully"}