'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useHistory, HistoryEntry } from '../hooks/useHistory'
import { useRouter } from 'next/navigation'

function ScorePill({ score, status }: { score: number; status: string }) {
  if (status === 'failed') return <span className="pill pill-fail">failed</span>
  if (score >= 8) return <span className="pill pill-hi">{score}/10</span>
  if (score >= 6) return <span className="pill pill-mid">{score}/10</span>
  return <span className="pill pill-lo">{score}/10</span>
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

interface SidebarCardProps {
  entry: HistoryEntry
  onDelete: (id: string) => Promise<void>
  onView: (id: string) => void
}

function SidebarCard({ entry, onDelete, onView }: SidebarCardProps) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 2500)
      return
    }
    setDeleting(true)
    try { await onDelete(entry._id) } finally { setDeleting(false) }
  }

  return (
    <div className="s-card" onClick={() => onView(entry._id)}>
      <div className="s-card-body">
        <p className="s-topic">{entry.topic}</p>
        <div className="s-meta">
          <span className="s-time">{timeAgo(entry.createdAt)}</span>
          <ScorePill score={entry.score} status={entry.status} />
        </div>
      </div>
      <button
        className={`s-del ${confirm ? 'confirming' : ''}`}
        onClick={handleDelete}
        disabled={deleting}
        title={confirm ? 'Click again to confirm' : 'Delete'}
      >
        {deleting ? '…' : confirm ? '?' : '×'}
      </button>

      <style jsx>{`
        .s-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s;
          border: 1px solid transparent;
        }
        .s-card:hover {
          background: var(--bg-elevated);
          border-color: var(--border);
        }
        .s-card-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .s-topic {
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        .s-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .s-time {
          font-size: 10px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .pill {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 100px;
        }
        .pill-hi   { background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent-mid); }
        .pill-mid  { background: #fdf6ec; color: #b07020; border: 1px solid #e0b070; }
        .pill-lo   { background: #fef2f2; color: #c0392b; border: 1px solid #fecaca; }
        .pill-fail { background: var(--bg-surface); color: var(--text-muted); border: 1px solid var(--border); }

        .s-del {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: var(--text-muted);
          background: transparent;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          opacity: 0;
          transition: all 0.15s;
        }
        .s-card:hover .s-del { opacity: 1; }
        .s-del:hover { background: #fef2f2; color: #c0392b; }
        .s-del.confirming { opacity: 1; background: #fef2f2; color: #c0392b; font-weight: 700; }
      `}</style>
    </div>
  )
}

interface HistorySidebarProps {
  open: boolean
  onClose: () => void
}

export default function HistorySidebar({ open, onClose }: HistorySidebarProps) {
  const { isSignedIn } = useAuth()
  const { history, loading, error, refetch, deleteEntry } = useHistory()
  const router = useRouter()

  const handleView = (id: string) => {
    router.push(`/history/${id}`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      {open && <div className="backdrop" onClick={onClose} />}

      {/* Sidebar panel */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Header */}
        <div className="sb-header">
          <div className="sb-title-row">
            <span className="sb-title">History</span>
            <button className="sb-close" onClick={onClose} title="Close">✕</button>
          </div>
          {!loading && !error && history.length > 0 && (
            <p className="sb-count">{history.length} saved {history.length === 1 ? 'session' : 'sessions'}</p>
          )}
        </div>

        {/* Content */}
        <div className="sb-content">
          {/* Loading */}
          {loading && (
            <div className="sb-skeletons">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="sk-item">
                  <div className="sk-line sk-title shimmer-line" />
                  <div className="sk-line sk-meta shimmer-line" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="sb-error">
              <p className="sb-err-msg">{error}</p>
              <button className="sb-retry" onClick={refetch}>Retry</button>
            </div>
          )}

          {/* Not signed in */}
          {!isSignedIn && !loading && (
            <div className="sb-empty">
              <span className="sb-empty-icon">◇</span>
              <p>Sign in to view your research history</p>
            </div>
          )}

          {/* Empty */}
          {isSignedIn && !loading && !error && history.length === 0 && (
            <div className="sb-empty">
              <span className="sb-empty-icon">◇</span>
              <p>No saved research yet.</p>
              <p className="sb-empty-sub">Run a search to get started.</p>
            </div>
          )}

          {/* List */}
          {!loading && !error && history.length > 0 && (
            <div className="sb-list">
              {history.map((entry, i) => (
                <div key={entry._id} style={{ animationDelay: `${i * 0.04}s` }} className="sb-item-wrap">
                  <SidebarCard entry={entry} onDelete={deleteEntry} onView={handleView} />
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <style jsx>{`
        /* ── Backdrop ── */
        .backdrop {
          position: fixed;
          inset: 0;
          z-index: 59;
          background: rgba(26, 20, 16, 0.25);
          backdrop-filter: blur(2px);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Sidebar ── */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 300px;
          z-index: 60;
          background: var(--bg-base);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 4px 0 24px rgba(26, 20, 16, 0.08);
        }

        .sidebar.open {
          transform: translateX(0);
        }

        /* ── Header ── */
        .sb-header {
          padding: 1.25rem 1rem 0.75rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-base);
          flex-shrink: 0;
        }

        .sb-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sb-title {
          font-family: var(--font-display);
          font-size: 1.15rem;
          color: var(--text-primary);
          font-weight: 400;
        }

        .sb-close {
          font-size: 13px;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .sb-close:hover {
          color: var(--text-primary);
          border-color: var(--border-strong);
          background: var(--bg-surface);
        }

        .sb-count {
          margin-top: 4px;
          font-size: 10px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
        }

        /* ── Content area ── */
        .sb-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        /* ── Skeletons ── */
        .sb-skeletons {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 4px;
        }

        .sk-item {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sk-line    { border-radius: 4px; }
        .sk-title   { height: 14px; width: 80%; }
        .sk-meta    { height: 10px; width: 40%; }

        /* ── Error ── */
        .sb-error {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        .sb-err-msg {
          font-size: 12px;
          color: #c0392b;
          font-family: var(--font-mono);
        }

        .sb-retry {
          font-size: 11px;
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 3px 10px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        /* ── Empty ── */
        .sb-empty {
          padding: 2.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .sb-empty-icon {
          font-size: 1.6rem;
          color: var(--border-strong);
          margin-bottom: 4px;
        }

        .sb-empty-sub {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* ── List ── */
        .sb-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sb-item-wrap {
          animation: fadeUp 0.3s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Scrollbar ── */
        .sb-content::-webkit-scrollbar { width: 3px; }
        .sb-content::-webkit-scrollbar-track { background: transparent; }
        .sb-content::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px; }

        @media (max-width: 480px) {
          .sidebar { width: 85vw; }
        }
      `}</style>
    </>
  )
}
