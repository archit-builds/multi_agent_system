"""
pipeline.py — async generator wrapper around the LangChain multi-agent pipeline.
Yields SSE-compatible dicts so FastAPI can stream them to the client.
"""

import asyncio
from typing import AsyncGenerator
from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain


async def run_research_pipeline_stream(topic: str) -> AsyncGenerator[dict, None]:
    """
    Async generator that runs the research pipeline step by step.
    Yields event dicts: {"step": str, "data": str | dict}
    """
    state: dict = {}
    loop = asyncio.get_event_loop()

    # ── Step 1: Search Agent ──────────────────────────────────────────────────
    yield {"step": "status", "data": "search_started", "message": "🔍 Search agent is gathering information..."}

    search_agent = build_search_agent()
    search_result = await loop.run_in_executor(
        None,
        lambda: search_agent.invoke({
            "messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]
        })
    )
    state["search_results"] = search_result["messages"][-1].content

    yield {"step": "search_results", "data": state["search_results"], "message": "✅ Search complete"}

    # ── Step 2: Reader Agent ─────────────────────────────────────────────────
    yield {"step": "status", "data": "reading_started", "message": "📄 Reader agent is scraping top resources..."}

    reader_agent = build_reader_agent()
    reader_result = await loop.run_in_executor(
        None,
        lambda: reader_agent.invoke({
            "messages": [("user",
                f"Based on the following search results about '{topic}', "
                f"pick the most relevant URL and scrape it for deeper content.\n\n"
                f"Search Results:\n{state['search_results'][:800]}"
            )]
        })
    )
    state["scraped_content"] = reader_result["messages"][-1].content

    yield {"step": "scraped_content", "data": state["scraped_content"], "message": "✅ Content scraped"}

    # ── Step 3: Writer Chain ─────────────────────────────────────────────────
    yield {"step": "status", "data": "writing_started", "message": "✍️ Writer is drafting the report..."}

    research_combined = (
        f"SEARCH RESULTS:\n{state['search_results']}\n\n"
        f"DETAILED SCRAPED CONTENT:\n{state['scraped_content']}"
    )

    state["report"] = await loop.run_in_executor(
        None,
        lambda: writer_chain.invoke({"topic": topic, "research": research_combined})
    )

    yield {"step": "report", "data": state["report"], "message": "✅ Report drafted"}

    # ── Step 4: Critic Chain ─────────────────────────────────────────────────
    yield {"step": "status", "data": "critiquing_started", "message": "🔎 Critic is reviewing the report..."}

    state["feedback"] = await loop.run_in_executor(
        None,
        lambda: critic_chain.invoke({"report": state["report"]})
    )

    yield {"step": "feedback", "data": state["feedback"], "message": "✅ Review complete"}

    # ── Done ──────────────────────────────────────────────────────────────────
    yield {"step": "done", "data": "pipeline_complete", "message": "🎉 Research pipeline finished!"}