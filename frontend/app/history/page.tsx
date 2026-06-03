'use client'

import { useHistory } from '../hooks/useHistory'
import HistoryCard from '../components/HistoryCard'
import Link from 'next/link'

export default function HistoryPage() {
  const { history, loading, error, refetch, deleteEntry } = useHistory()

  return (
    <div className="page">
      <main className="main">
        <div className="container">

          {/* Page header */}
          <header className="page-header">
            <div className="header-left">
              <Link href="/" className="back-link">← Home</Link>
              <h1 className="page-title">Research History</h1>
              <p className="page-sub">
                Your saved research sessions, newest first
              </p>
            </div>
            <Link href="/" className="new-btn">+ New Research</Link>
          </header>

          {/* Loading skeleton */}
          {loading && (
            <div className="skeleton-list">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skel-line skel-title shimmer-line" />
                  <div className="skel-line skel-meta shimmer-line" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="error-card">
              <span className="error-icon">⚠</span>
              <div>
                <p className="error-title">Could not load history</p>
                <p className="error-msg">{error}</p>
                <button className="retry-btn" onClick={refetch}>Retry</button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && history.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">◇</span>
              <p className="empty-title">No research saved yet</p>
              <p className="empty-sub">
                Run a search on the home page — your results will appear here.
              </p>
              <Link href="/" className="new-btn">Start researching →</Link>
            </div>
          )}

          {/* History list */}
          {!loading && !error && history.length > 0 && (
            <div className="history-list">
              <p className="count-label">
                {history.length} saved {history.length === 1 ? 'entry' : 'entries'}
              </p>
              {history.map((entry, i) => (
                <div
                  key={entry._id}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <HistoryCard entry={entry} onDelete={deleteEntry} />
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100dvh;
          background: var(--bg-base);
        }

        .main {
          padding: 2rem 1.5rem 4rem;
        }

        .container {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* ── Page header ── */
        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .back-link {
          font-size: 12px;
          color: var(--text-muted);
          text-decoration: none;
          font-family: var(--font-mono);
          letter-spacing: 0.03em;
          transition: color 0.15s;
        }

        .back-link:hover { color: var(--accent); }

        .page-title {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 400;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .page-sub {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .new-btn {
          font-size: 13px;
          font-weight: 500;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 9px;
          padding: 8px 18px;
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.15s;
          white-space: nowrap;
          align-self: center;
        }

        .new-btn:hover { opacity: 0.88; }

        /* ── Skeleton ── */
        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skeleton-card {
          padding: 1.1rem 1.25rem;
          background: var(--bg-elevated);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skel-line { border-radius: 6px; }
        .skel-title { height: 18px; width: 65%; }
        .skel-meta  { height: 12px; width: 30%; }

        /* ── Error ── */
        .error-card {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 1rem 1.25rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
        }

        .error-icon  { font-size: 1.1rem; color: #c0392b; margin-top: 1px; flex-shrink: 0; }
        .error-title { font-size: 13px; font-weight: 500; color: #c0392b; margin-bottom: 2px; }
        .error-msg   { font-size: 12px; color: #c0392b; opacity: 0.8; font-family: var(--font-mono); }

        .retry-btn {
          margin-top: 8px;
          font-size: 12px;
          background: none;
          border: 1px solid #fecaca;
          color: #c0392b;
          border-radius: 6px;
          padding: 4px 12px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .retry-btn:hover { background: #fef2f2; }

        /* ── Empty state ── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 4rem 2rem;
          text-align: center;
          animation: fadeUp 0.5s ease;
        }

        .empty-icon  { font-size: 2.5rem; color: var(--border-strong); }
        .empty-title { font-family: var(--font-display); font-size: 1.2rem; color: var(--text-primary); }
        .empty-sub   { font-size: 13px; color: var(--text-muted); max-width: 320px; line-height: 1.55; }

        /* ── History list ── */
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .count-label {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
