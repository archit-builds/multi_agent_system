"""
pipeline.py — async generator wrapper around the LangChain multi-agent pipeline.

Emits two kinds of SSE events:

1. Content events (unchanged, consumed by ResultsPanel):
   {"step": "search_results" | "scraped_content" | "report" | "feedback", "data": "..."}

2. Graph events (new, consumed by ResearchGraph):
   {"step": "node_add",    "node": {id, type, label, status, meta?}}
   {"step": "node_update", "id": "...", "status": "...", "meta"?: {...}}
   {"step": "edge_add",    "edge": {id, from, to}}

Node types:  topic | agent | source | output | score
Node status: pending | active | done | error | selected
"""

import asyncio
import re
import time
from typing import AsyncGenerator
from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain


# ── Helpers ───────────────────────────────────────────────────────────────────

def _domain(url: str) -> str:
    """Extract clean domain from URL."""
    try:
        from urllib.parse import urlparse
        host = urlparse(url).hostname or url
        return host.replace("www.", "")
    except Exception:
        return url[:30]


def _extract_urls(text: str) -> list[str]:
    """Pull all https URLs out of agent output text."""
    pattern = r"https?://(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}(?:[-a-zA-Z0-9@:%_+.~#?&/=]*)"
    urls = re.findall(pattern, text)
    # Deduplicate while preserving order
    seen = set()
    result = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            result.append(u)
    return result


def _extract_selected_url(agent_messages: list) -> str:
    """
    Find the URL the reader agent actually called scrape_webpage on.
    It appears as a ToolMessage or in AI message tool_calls.
    """
    for msg in agent_messages:
        # Tool call arguments
        if hasattr(msg, "tool_calls"):
            for tc in (msg.tool_calls or []):
                args = tc.get("args", {})
                url = args.get("url", "")
                if url.startswith("http"):
                    return url
        # Tool result content often starts with the URL
        if hasattr(msg, "content") and isinstance(msg.content, str):
            urls = _extract_urls(msg.content)
            if urls:
                return urls[0]
    return ""


def _extract_score(feedback: str) -> int:
    m = re.search(r"Score:\s*(\d+)/10", feedback)
    return int(m.group(1)) if m else 0


def _word_count(text: str) -> int:
    return len(text.split())


# ── Graph event factories ──────────────────────────────────────────────────────

def _node(id: str, type: str, label: str, status: str, meta: dict | None = None) -> dict:
    n = {"id": id, "type": type, "label": label, "status": status}
    if meta:
        n["meta"] = meta
    return {"step": "node_add", "node": n}


def _edge(from_id: str, to_id: str) -> dict:
    return {"step": "edge_add", "edge": {"id": f"{from_id}-{to_id}", "from": from_id, "to": to_id}}


def _update(id: str, status: str, meta: dict | None = None) -> dict:
    e = {"step": "node_update", "id": id, "status": status}
    if meta:
        e["meta"] = meta
    return e


# ── Main pipeline ─────────────────────────────────────────────────────────────

async def run_research_pipeline_stream(topic: str) -> AsyncGenerator[dict, None]:
    state: dict = {}
    loop = asyncio.get_event_loop()

    # ── Root: Topic node ──────────────────────────────────────────────────────
    yield _node("topic", "topic", topic[:40] + ("…" if len(topic) > 40 else ""), "done")

    # ── Step 1: Search Agent ──────────────────────────────────────────────────
    yield {"step": "status", "data": "search_started", "message": "🔍 Search agent is gathering information..."}
    yield _node("search-agent", "agent", "Search Agent", "active", {"description": "Scanning the web with Tavily"})
    yield _edge("topic", "search-agent")

    t0 = time.time()
    search_agent = build_search_agent()
    search_result = await loop.run_in_executor(
        None,
        lambda: search_agent.invoke({
            "messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]
        })
    )
    search_elapsed = round(time.time() - t0, 1)
    state["search_results"] = search_result["messages"][-1].content

    # Extract URLs the agent found and emit as source nodes
    found_urls = _extract_urls(state["search_results"])[:5]  # cap at 5
    for i, url in enumerate(found_urls):
        node_id = f"src-{i}"
        yield _node(node_id, "source", _domain(url), "found", {"url": url})
        yield _edge("search-agent", node_id)
        await asyncio.sleep(0.08)  # stagger so graph animates nicely

    yield _update("search-agent", "done", {
        "elapsed": f"{search_elapsed}s",
        "sources_found": len(found_urls),
    })

    # Content event (ResultsPanel)
    yield {"step": "search_results", "data": state["search_results"], "message": "✅ Search complete"}

    # ── Step 2: Reader Agent ──────────────────────────────────────────────────
    yield {"step": "status", "data": "reading_started", "message": "📄 Reader agent is scraping top resources..."}
    yield _node("reader-agent", "agent", "Reader Agent", "active", {"description": "Selecting best URL to scrape"})
    yield _edge("search-agent", "reader-agent")

    t0 = time.time()
    reader_agent = build_reader_agent()
    reader_result = await loop.run_in_executor(
        None,
        lambda: reader_agent.invoke({
            "messages": [("user",
                f"Based on the following search results about '{topic}', "
                f"pick the most relevant URL and scrape it for deeper content.\n\n"
                f"Search Results:\n{state['search_results']}"
            )]
        })
    )
    reader_elapsed = round(time.time() - t0, 1)
    state["scraped_content"] = reader_result["messages"][-1].content

    # Find which URL was actually selected
    selected_url = _extract_selected_url(reader_result["messages"])
    selected_domain = _domain(selected_url) if selected_url else "webpage"

    # Mark selected source node
    if selected_url:
        for i, url in enumerate(found_urls):
            if _domain(url) == _domain(selected_url):
                yield _update(f"src-{i}", "selected")
                break

    yield _node("scraped", "source", f"Scraped: {selected_domain}", "done", {
        "url": selected_url,
        "chars": len(state["scraped_content"]),
    })
    yield _edge("reader-agent", "scraped")
    yield _update("reader-agent", "done", {
        "elapsed": f"{reader_elapsed}s",
        "url": selected_url,
    })

    # Content event
    yield {"step": "scraped_content", "data": state["scraped_content"], "message": "✅ Content scraped"}

    # ── Step 3: Writer Chain ──────────────────────────────────────────────────
    yield {"step": "status", "data": "writing_started", "message": "✍️ Writer is drafting the report..."}
    yield _node("writer", "agent", "Writer Chain", "active", {"description": "Synthesising research into report"})
    yield _edge("reader-agent", "writer")

    research_combined = (
        f"SEARCH RESULTS:\n{state['search_results']}\n\n"
        f"DETAILED SCRAPED CONTENT:\n{state['scraped_content']}"
    )

    t0 = time.time()
    state["report"] = await loop.run_in_executor(
        None,
        lambda: writer_chain.invoke({"topic": topic, "research": research_combined})
    )
    writer_elapsed = round(time.time() - t0, 1)
    words = _word_count(state["report"])

    yield _node("report-node", "output", f"Report · {words} words", "done", {
        "words": words,
    })
    yield _edge("writer", "report-node")
    yield _update("writer", "done", {"elapsed": f"{writer_elapsed}s", "words": words})

    # Content event
    yield {"step": "report", "data": state["report"], "message": "✅ Report drafted"}

    # ── Step 4: Critic Chain ──────────────────────────────────────────────────
    yield {"step": "status", "data": "critiquing_started", "message": "🔎 Critic is reviewing the report..."}
    yield _node("critic", "agent", "Critic Chain", "active", {"description": "Evaluating quality & scoring"})
    yield _edge("report-node", "critic")

    t0 = time.time()
    state["feedback"] = await loop.run_in_executor(
        None,
        lambda: critic_chain.invoke({"report": state["report"]})
    )
    critic_elapsed = round(time.time() - t0, 1)
    score = _extract_score(state["feedback"])

    yield _node("score-node", "score", f"Score: {score}/10", "done", {
        "score": score,
        "elapsed": f"{critic_elapsed}s",
    })
    yield _edge("critic", "score-node")
    yield _update("critic", "done", {"elapsed": f"{critic_elapsed}s", "score": score})

    # Content event
    yield {"step": "feedback", "data": state["feedback"], "message": "✅ Review complete"}

    # ── Done ─────────────────────────────────────────────────────────────────
    yield {"step": "done", "data": "pipeline_complete", "message": "🎉 Research pipeline finished!"}