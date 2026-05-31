from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.tools import tavily_search, scrape_webpage
from dotenv import load_dotenv
from langchain_core.rate_limiters import InMemoryRateLimiter


load_dotenv()
rate_limiter = InMemoryRateLimiter(
    requests_per_second=0.15,   # ~9 RPM, just under the 10 RPM free limit
    check_every_n_seconds=0.5,
)
# Initialize the Google GenAI model
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    max_retries=3,
)

def build_search_agent():
    return create_agent(
        model=llm,
        tools=[tavily_search],
        system_prompt="You are a helpful research agent. Use the tavily_search tool to find recent and reliable information. Once you have found enough information, provide a final synthesized summary of the search results and do not call the tool again."
    )

def build_reader_agent():
    return create_agent(
        model=llm,
        tools=[scrape_webpage],
        system_prompt="You are a reading agent. Use the scrape_webpage tool to extract content from the given URL. Return the scraped text and do not call the tool repeatedly once you have the content."
    )

#writer chain 

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

#critic_chain 

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
