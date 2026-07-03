# Multi-Agent Research System

An AI-powered, multi-agent research pipeline that automates the process of deep web research, report generation, and self-evaluation. It orchestrates a series of specialized LLM agents and chains to browse the web, extract content, write detailed reports, and provide a critical review—streaming real-time progress to a responsive web dashboard.

## 🎯 What Problem Does It Solve?

Manual internet research is a time-consuming cognitive workflow: querying search engines, reading through multiple links, extracting the relevant details, synthesizing the information into a cohesive format, and verifying the quality of the findings.

This multi-agent system fully automates this workflow by dividing the labor among specialized AI personas:

1. **Search Agent**: Scours the web for recent, reliable, and relevant information without getting distracted.
2. **Reader Agent**: Dives deeper by scraping and extracting raw text from the most promising source found during the search.
3. **Writer Chain**: Synthesizes the aggregated search and scraped context into a comprehensive, highly-structured research report (Intro, Findings, Conclusion, Sources).
4. **Critic Chain**: Acts as an objective reviewer to evaluate the generated report, scoring it out of 10 and offering concrete feedback (Strengths and Areas to Improve).

By breaking down the research task into this autonomous, multi-step pipeline, the system dramatically accelerates knowledge gathering and ensures high report quality through an automated critique loop.

## 🏗️ Architecture & How It's Built

The project is structured as a full-stack monorepo featuring a **Python (FastAPI)** backend and a **Next.js** frontend.

### 🧠 Backend (Python / LangChain)

The backend acts as the orchestration engine for the AI agents, built around modern asynchronous Python and LangChain.

- **API Framework:** FastAPI, featuring Server-Sent Events (SSE) via `StreamingResponse` to push pipeline status updates to the client in real-time.
- **AI/LLM Engine:** LangChain initialized with **Groq** (`openai/gpt-oss-120b`) for extremely fast, high-quality reasoning.
- **Custom Tools:**
  - `tavily_search`: Uses the Tavily API to fetch clean, AI-optimized web search results.
  - `scrape_webpage`: Uses `requests` and `BeautifulSoup4` to download and clean HTML text from the target URLs.
- **Pipeline Flow:** The pipeline (`pipeline.py`) is written as an `AsyncGenerator`. It sequentially triggers the Search Agent -> Reader Agent -> Writer Prompt -> Critic Prompt, yielding precise state transitions (`status`, `search_results`, `scraped_content`, `report`, `feedback`, `done`) back to the frontend.

### 💻 Frontend (Next.js)

The frontend is a lightweight, instantly reactive web interface for interacting with the AI pipeline.

- **Framework:** Next.js 16 (App Router) combined with React 19.
- **Styling:** Setup with the new Tailwind CSS v4.
- **UI Components:**
  - Uses Server-Sent Events (SSE) handled via a custom hook (`useResearch`) to track the exact state of what the AI is currently doing.
  - `PipelineTracker`: Displays real-time progress logs (e.g., _🔍 Search agent is gathering information..._).
  - `ResultsPanel`: Leverages `react-markdown` and `remark-gfm` to elegantly render the LLM's generated markdown reports and critiques.

## 📂 Codebase Structure

```text
├── backend/                  # API server and AI orchestrator
│   ├── main.py               # FastAPI application and SSE streaming endpoints
│   ├── pipeline.py           # The async multi-agent execution pipeline
│   ├── agents.py             # Agent definitions, LLM config, and Chains (Writer/Critic)
│   ├── tools.py              # External tools (Tavily search, web scraping)
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # Web Dashboard
    ├── package.json          # React/Next.js dependencies
    ├── app/
    │   ├── page.tsx          # Main entry route combining all UI sections
    │   ├── globals.css       # Global styles and CSS variables
    │   ├── components/       # UI modules: SearchBar, PipelineTracker, ResultsPanel
    │   └── hooks/            # Custom React hooks (useResearch) for SSE state management
    ├── next.config.ts        # Next.js configurations
    └── tsconfig.json         # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+)
- Python (3.10+)
- LLM API Keys (Groq) and Web Search API Keys (Tavily)

### 1. Setup Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\Activate.ps1` on Windows
pip install -r requirements.txt

# Create a .env file and add your keys
# GROQ_API_KEY=your_key_here
# TAVILY_API_KEY=your_key_here

# Run the FastAPI server (typically on port 8000)
fastapi dev main.py
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to interact with the Multi-Agent Research System!
