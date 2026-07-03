'use client'

import { useParams, useRouter } from 'next/navigation'
import { useResearchDetail } from '../../hooks/useHistory'
import Link from 'next/link'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type TabId = 'report' | 'critique' | 'sources'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'report',   label: 'Report',   icon: '◇' },
  { id: 'critique', label: 'Critique', icon: '◈' },
  { id: 'sources',  label: 'Sources',  icon: '◎' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ScoreBadge({ score, status }: { score: number; status: string }) {
  if (status === 'failed') {
    return (
      <span className="score-badge badge-failed">Pipeline failed</span>
    )
  }
  const color = score >= 8 ? '#3d6b3d' : score >= 6 ? '#b07020' : '#c0392b'
  return (
    <div className="score-badge-wrap" style={{ '--c': color } as React.CSSProperties}>
      <span className="score-num">{score}</span>
      <span className="score-denom">/10</span>
    </div>
  )
}

function SourcesView({ raw }: { raw: string }) {
  const urlRegex = /https?:\/\/[^\s"'<>)\]]+/g
  const urls = Array.from(new Set(raw.match(urlRegex) ?? []))
  if (!urls.length) {
    return <p className="no-sources">No URLs found in search results.</p>
  }
  return (
    <div className="sources-list">
      {urls.map((url, i) => {
        let host = ''
        try { host = new URL(url).hostname.replace('www.', '') } catch {}
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="source-item">
            <span className="src-index">{String(i + 1).padStart(2, '0')}</span>
            <div className="src-detail">
              <span className="src-host">{host}</span>
              <span className="src-url">{url}</span>
            </div>
            <span className="src-arrow">↗</span>
          </a>
        )
      })}
    </div>
  )
}

export default function ResearchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { entry, loading, error } = useResearchDetail(id)
  const [activeTab, setActiveTab] = useState<TabId>('report')
  const router = useRouter()

  return (
    <div className="page">
      <main className="main">
        <div className="container">

          {/* Loading */}
          {loading && (
            <div className="skeleton-page">
              <div className="skel-back shimmer-line" />
              <div className="skel-title shimmer-line" />
              <div className="skel-meta shimmer-line" />
              <div className="skel-body shimmer-line" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="error-card">
              <span>⚠ {error}</span>
              <button onClick={() => router.back()} className="back-link">← Go back</button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && entry && (
            <>
              {/* Back */}
              <button onClick={() => router.back()} className="back-link">← Back</button>

              <header className="research-header">
                <div className="header-top">
                  <h1 className="research-topic">{entry.topic}</h1>
                  <ScoreBadge score={entry.score} status={entry.status} />
                </div>
                <div className="header-meta">
                  <span className="meta-date">{formatDate(entry.createdAt)}</span>
                  <span className={`status-badge status-${entry.status}`}>
                    {entry.status}
                  </span>
                </div>
              </header>

              {/* Tabs */}
              {entry.result && (
                <div className="results-panel">
                  <div className="tab-bar" role="tablist">
                    {TABS.map((tab) => {
                      const available = !!(
                        tab.id === 'report'   ? entry.result?.report :
                        tab.id === 'critique' ? entry.result?.feedback :
                        entry.result?.search_results
                      )
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          aria-selected={activeTab === tab.id}
                          className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${!available ? 'disabled' : ''}`}
                          onClick={() => available && setActiveTab(tab.id)}
                          disabled={!available}
                        >
                          <span className="tab-icon">{tab.icon}</span>
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="tab-content">
                    {activeTab === 'report' && (
                      <div className="prose-report animate-in">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {entry.result.report || '*No report available.*'}
                        </ReactMarkdown>
                      </div>
                    )}
                    {activeTab === 'critique' && (
                      <div className="prose-report animate-in">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {entry.result.feedback || '*No critique available.*'}
                        </ReactMarkdown>
                      </div>
                    )}
                    {activeTab === 'sources' && (
                      <div className="animate-in">
                        <SourcesView raw={entry.result.search_results} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!entry.result && (
                <p className="no-result">No result data stored for this entry.</p>
              )}
            </>
          )}

        </div>
      </main>

      <style jsx>{`
        .page { min-height: 100dvh; background: var(--bg-base); }

        .main { padding: 2rem 1.5rem 4rem; }

        .container {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* ── Skeleton ── */
        .skeleton-page { display: flex; flex-direction: column; gap: 14px; padding-top: 1rem; }
        .skel-back  { height: 14px; width: 140px; border-radius: 6px; }
        .skel-title { height: 28px; width: 70%;   border-radius: 6px; }
        .skel-meta  { height: 14px; width: 40%;   border-radius: 6px; }
        .skel-body  { height: 300px; width: 100%; border-radius: 12px; margin-top: 1rem; }

        /* ── Back link/button ── */
        .back-link {
          font-size: 12px;
          color: var(--text-muted);
          text-decoration: none;
          font-family: var(--font-mono);
          letter-spacing: 0.03em;
          transition: color 0.15s;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        .back-link:hover { color: var(--accent); }

        /* ── Research header ── */
        .research-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .research-topic {
          font-family: var(--font-display);
          font-size: 1.65rem;
          font-weight: 400;
          color: var(--text-primary);
          line-height: 1.25;
          flex: 1;
        }

        /* Score badge */
        .score-badge-wrap {
          display: inline-flex;
          align-items: baseline;
          gap: 2px;
          padding: 6px 16px;
          background: color-mix(in srgb, var(--c) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
          border-radius: 100px;
          flex-shrink: 0;
        }
        .score-num   { font-family: var(--font-display); font-size: 1.5rem; color: var(--c); line-height: 1; }
        .score-denom { font-size: 0.8rem; color: var(--c); opacity: 0.6; }
        .score-badge.badge-failed {
          padding: 6px 14px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 100px;
          font-size: 12px;
          color: #888;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .meta-date { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); }
        .status-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 10px;
          border-radius: 100px;
          text-transform: capitalize;
        }
        .status-completed { background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent-mid); }
        .status-failed    { background: #fef2f2; color: #c0392b; border: 1px solid #fecaca; }

        /* ── Results panel ── */
        .results-panel {
          background: var(--bg-elevated);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }

        .tab-bar {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: var(--bg-surface);
          padding: 0 0.5rem;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tab-btn:hover:not(.disabled):not(.active) { color: var(--text-secondary); }
        .tab-btn.active  { color: var(--accent); border-bottom-color: var(--accent); }
        .tab-btn.disabled { opacity: 0.35; cursor: not-allowed; }
        .tab-icon { font-size: 10px; }

        .tab-content { padding: 1.75rem 2rem; min-height: 200px; }

        .animate-in { animation: fadeUp 0.35s ease; }

        /* Sources */
        .sources-list { display: flex; flex-direction: column; gap: 8px; }
        .source-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.15s;
        }
        .source-item:hover { background: var(--accent-light); border-color: var(--accent-mid); }
        .src-index  { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
        .src-detail { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .src-host   { font-size: 13px; font-weight: 500; color: var(--accent); }
        .src-url    { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .src-arrow  { font-size: 14px; color: var(--text-muted); flex-shrink: 0; }
        .no-sources { font-size: 13px; color: var(--text-muted); }

        /* ── Error ── */
        .error-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 1rem 1.25rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          font-size: 13px;
          color: #c0392b;
        }

        .no-result { font-size: 13px; color: var(--text-muted); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
