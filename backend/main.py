from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
from .pipeline import run_research_pipeline_stream
app = FastAPI(
    title="Multi-Agent Research API",
    description="AI-powered research pipeline using LangChain agents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str


@app.get("/")
async def root():
    return {"message": "Research Pipeline API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/research/stream")
async def research_stream(request: ResearchRequest):
    """
    Streams research pipeline progress as Server-Sent Events (SSE).
    Each event has a 'step' and 'data' field.
    Steps: searching, reading, writing, critiquing, done, error
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    async def event_generator():
        try:
            async for event in run_research_pipeline_stream(request.topic):
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0)  # yield control to event loop
        except Exception as e:
            error_event = {"step": "error", "data": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        },
    )


@app.post("/api/research")
async def research(request: ResearchRequest):
    """
    Non-streaming endpoint — runs the full pipeline and returns all results at once.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    try:
        result = {}
        async for event in run_research_pipeline_stream(request.topic):
            step = event.get("step")
            data = event.get("data")
            if step == "search_results":
                result["search_results"] = data
            elif step == "scraped_content":
                result["scraped_content"] = data
            elif step == "report":
                result["report"] = data
            elif step == "feedback":
                result["feedback"] = data
            elif step == "error":
                raise HTTPException(status_code=500, detail=data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))