from langchain_core.tools import tool
import requests
from bs4 import BeautifulSoup
from tavily import TavilyClient
import os
from dotenv import load_dotenv

load_dotenv()

tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


@tool
def search_web(query: str) -> list:
    """Search the web for recent and reliable information and return the top 5 results."""
    response = tavily_client.search(query=query, max_results=5)
    results = response.get("results", [])
    # Return only minimal information to prevent blowing up the LLM context window
    cleaned = []
    for r in results:
        content = r.get("content", "")
        if content:
            cleaned.append({"url": r.get("url"), "content": content[:800]})
    return cleaned


@tool
def scrape_webpage(url: str) -> str:
    """Scrape and extract the text content of a given webpage URL using BeautifulSoup."""
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        for element in soup(["script", "style", "header", "footer", "nav", "aside"]):
            element.extract()

        text = soup.get_text(separator=" ", strip=True)[:1000]
        return text
    except Exception as e:
        return f"An error occurred while scraping: {str(e)}"