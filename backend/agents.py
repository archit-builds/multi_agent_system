from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import search_web, scrape_webpage
from dotenv import load_dotenv
from langchain_core.rate_limiters import InMemoryRateLimiter


load_dotenv()
rate_limiter = InMemoryRateLimiter(
    requests_per_second=0.15,   # ~9 RPM, just under the 10 RPM free limit
    check_every_n_seconds=0.5,
)

# ── Models ────────────────────────────────────────────────────────────────────
# Tool-calling agents need the fine-tuned tool-use model to avoid malformed
# function-call JSON (error 400 tool_use_failed) from the versatile model.
tool_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0,
    max_retries=3,
    rate_limiter=rate_limiter,
)

# Writer / Critic chains don't call tools — versatile model is fine here.
llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    max_retries=3,
    rate_limiter=rate_limiter,
)

def build_search_agent():
    return create_agent(
        model=tool_llm,
        tools=[search_web],
        system_prompt=(
            "You are a helpful research agent. You MUST use the `search_web` tool to find "
            "recent and reliable information. Do NOT hallucinate or use any other tools (like brave_search). "
            "Once you have found enough information, provide a final synthesized summary "
            "of the search results and do not call the tool again."
        )
    )

def build_reader_agent():
    return create_agent(
        model=tool_llm,
        tools=[scrape_webpage],
        system_prompt=(
            "You are a reading agent. Use the scrape_webpage tool to extract content "
            "from the given URL. Return the scraped text and do not call the tool "
            "repeatedly once you have the content. VERY IMPORTANT: Carefully extract "
            "the URL from the search results exactly as it is written. Do not include "
            "trailing parentheses, quotes, or punctuation inside the URL."
        )
    )

# ── Writer chain ──────────────────────────────────────────────────────────────

writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
    ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
])

writer_chain = writer_prompt | llm | StrOutputParser()

# ── Critic chain ──────────────────────────────────────────────────────────────

critic_prompt = ChatPromptTemplate.from_messages([
     ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
..."""),
])

critic_chain = critic_prompt | llm | StrOutputParser()
