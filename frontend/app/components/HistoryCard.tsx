'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HistoryEntry } from '../hooks/useHistory'

interface HistoryCardProps {
  entry: HistoryEntry
  onDelete: (id: string) => Promise<void>
}

function ScorePill({ score, status }: { score: number; status: string }) {
  if (status === 'failed') {
    return <span className="pill pill-failed">Failed</span>
  }
  const color = score >= 8 ? 'green' : score >= 6 ? 'amber' : 'red'
  return (
    <span className={`pill pill-${color}`}>
      {score}<span className="pill-denom">/10</span>
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryCard({ entry, onDelete }: HistoryCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      // Auto-cancel confirm after 3 s
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    setDeleting(true)
    try {
      await onDelete(entry._id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="history-card">
      <div className="card-body">
        {/* Topic */}
        <Link href={`/history/${entry._id}`} className="card-topic">
          {entry.topic}
        </Link>

        {/* Meta row */}
        <div className="card-meta">
          <span className="card-date">{formatDate(entry.createdAt)}</span>
          <ScorePill score={entry.score} status={entry.status} />
        </div>
      </div>

      {/* Actions */}
      <div className="card-actions">
        <Link href={`/history/${entry._id}`} className="btn-view">
          View →
        </Link>
        <button
          className={`btn-delete ${confirmDelete ? 'confirming' : ''}`}
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete research"
        >
          {deleting ? '…' : confirmDelete ? 'Confirm?' : '✕'}
        </button>
      </div>

      <style jsx>{`
        .history-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--bg-elevated);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          animation: fadeUp 0.35s ease both;
        }

        .history-card:hover {
          border-color: var(--accent-mid);
          box-shadow: 0 2px 12px rgba(61, 107, 61, 0.07);
        }

        .card-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .card-topic {
          font-family: var(--font-display);
          font-size: 1rem;
          color: var(--text-primary);
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.15s;
        }

        .card-topic:hover {
          color: var(--accent);
        }

        .card-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-date {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* Score pills */
        .pill {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 100px;
        }

        .pill-denom {
          font-size: 10px;
          font-weight: 400;
          opacity: 0.7;
        }

        .pill-green  { background: #eef4ee; color: #3d6b3d; border: 1px solid #82ab82; }
        .pill-amber  { background: #fdf6ec; color: #b07020; border: 1px solid #e0b070; }
        .pill-red    { background: #fef2f2; color: #c0392b; border: 1px solid #fecaca; }
        .pill-failed { background: #f5f5f5; color: #666;    border: 1px solid #ddd; }

        /* Actions */
        .card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .btn-view {
          font-size: 12px;
          font-weight: 500;
          color: var(--accent);
          text-decoration: none;
          padding: 5px 12px;
          border-radius: 7px;
          border: 1px solid var(--accent-mid);
          background: var(--accent-light);
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-view:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .btn-delete {
          font-size: 12px;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-delete:hover:not(:disabled) {
          color: #c0392b;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .btn-delete.confirming {
          color: #c0392b;
          border-color: #c0392b;
          background: #fef2f2;
          animation: pulse 0.5s ease;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 500px) {
          .history-card { flex-direction: column; align-items: flex-start; }
          .card-actions { width: 100%; }
          .btn-view { flex: 1; text-align: center; }
        }
      `}</style>
    </div>
  )
}
