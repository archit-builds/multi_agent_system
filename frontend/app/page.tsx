'use client'

import { useResearch } from './hooks/useResearch'
import SearchBar from './components/SearchBar'
import PipelineTracker from './components/PipelineTracker'
import ResultsPanel from './components/ResultsPanel'

export default function HomePage() {
  const { state, run, reset } = useResearch()

  const isLoading = !['idle', 'done', 'error'].includes(state.status)
  const hasResults = !!(state.report || state.feedback || state.search_results)

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="logo-mark">
          <span className="logo-diamond">◆</span>
          <span className="logo-diamond dim">◈</span>
          <span className="logo-diamond dimmer">◇</span>
        </div>
        <div className="header-text">
          <h1 className="site-title">Research Intelligence</h1>
          <p className="site-sub">Multi-agent AI pipeline · Search → Read → Write → Critique</p>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        <div className="container">

          {/* Search */}
          <section className="search-section">
            <SearchBar onSearch={run} isLoading={isLoading} onReset={reset} />
          </section>

          {/* Pipeline progress */}
          {state.status !== 'idle' && (
            <section className="tracker-section">
              <PipelineTracker status={state.status} message={state.message} />
            </section>
          )}

          {/* Error display */}
          {state.status === 'error' && state.error && (
            <div className="error-card">
              <span className="error-icon">⚠</span>
              <div>
                <p className="error-title">Pipeline failed</p>
                <p className="error-msg">{state.error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <section className="results-section">
              <ResultsPanel state={state} />
            </section>
          )}

          {/* Idle empty state */}
          {state.status === 'idle' && (
            <div className="empty-state">
              <div className="empty-grid">
                {[
                  { icon: '◎', title: 'Search Agent',   desc: 'Scans the web with Tavily for fresh, relevant sources on your topic.' },
                  { icon: '◈', title: 'Reader Agent',   desc: 'Picks the best URL and deep-scrapes its content for richer detail.' },
                  { icon: '◇', title: 'Writer Chain',   desc: 'Synthesises all research into a structured, professional report.' },
                  { icon: '◆', title: 'Critic Chain',   desc: 'Reviews the report, scores it out of 10, and highlights improvements.' },
                ].map((card) => (
                  <div key={card.icon} className="empty-card">
                    <span className="empty-icon">{card.icon}</span>
                    <h3 className="empty-card-title">{card.title}</h3>
                    <p className="empty-card-desc">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <span>Built with LangChain · Gemini 2.5 Flash · FastAPI · Next.js</span>
      </footer>

      <style jsx>{`
        .page {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-base);
        }

        /* ── Header ── */
        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 2rem 2rem 0;
          max-width: 820px;
          margin: 0 auto;
          width: 100%;
        }

        .logo-mark {
          display: flex;
          align-items: center;
          gap: -2px;
          font-size: 1.4rem;
          line-height: 1;
          letter-spacing: -4px;
        }

        .logo-diamond      { color: var(--accent); }
        .logo-diamond.dim  { color: var(--accent-mid); }
        .logo-diamond.dimmer { color: var(--border-strong); }

        .header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .site-title {
          font-family: var(--font-display);
          font-size: 1.45rem;
          font-weight: 400;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .site-sub {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
        }

        /* ── Main ── */
        .main {
          flex: 1;
          padding: 2rem 1.5rem 3rem;
        }

        .container {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .search-section  { width: 100%; }
        .tracker-section { width: 100%; }
        .results-section {
          width: 100%;
          animation: fadeUp 0.5s ease;
        }

        /* ── Error ── */
        .error-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 1rem 1.25rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          animation: fadeUp 0.3s ease;
        }

        .error-icon {
          font-size: 1.1rem;
          color: #c0392b;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .error-title {
          font-size: 13px;
          font-weight: 500;
          color: #c0392b;
          margin-bottom: 2px;
        }

        .error-msg {
          font-size: 12px;
          color: #c0392b;
          opacity: 0.8;
          font-family: var(--font-mono);
        }

        /* ── Empty state ── */
        .empty-state {
          animation: fadeUp 0.6s ease 0.1s both;
        }

        .empty-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (max-width: 560px) {
          .empty-grid { grid-template-columns: 1fr; }
        }

        .empty-card {
          padding: 1.25rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.2s;
        }

        .empty-card:hover {
          border-color: var(--accent-mid);
        }

        .empty-icon {
          font-size: 1.1rem;
          color: var(--accent);
        }

        .empty-card-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          font-family: var(--font-body);
        }

        .empty-card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        /* ── Footer ── */
        .footer {
          text-align: center;
          padding: 1.5rem;
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          border-top: 1px solid var(--border);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}