'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

// ── Types that mirror the MongoDB schema ──────────────────────────────────────

export interface HistoryEntry {
  _id: string
  userId: string
  userEmail: string
  topic: string
  createdAt: string   // ISO string (serialised by backend)
  score: number       // 0-10
  status: 'completed' | 'failed'
  // result is NOT included in the list endpoint — only in the detail endpoint
  result?: ResearchResult
}

export interface ResearchResult {
  report: string
  feedback: string
  search_results: string
  scraped_content: string
}

// ── Hook: fetch history list ──────────────────────────────────────────────────

export function useHistory() {
  const { getToken, isSignedIn } = useAuth()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const res = await fetch('/api/history', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      setHistory(data.history ?? [])
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const deleteEntry = useCallback(async (id: string) => {
    const token = await getToken()
    const res = await fetch(`/api/history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Failed to delete')
    setHistory((prev) => prev.filter((e) => e._id !== id))
  }, [getToken])

  return { history, loading, error, refetch: fetchHistory, deleteEntry }
}

// ── Hook: fetch a single research detail ─────────────────────────────────────

export function useResearchDetail(id: string) {
  const { getToken, isSignedIn } = useAuth()
  const [entry, setEntry]   = useState<HistoryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || !id) return

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        const res = await fetch(`/api/history/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        setEntry(data)
      } catch (err: unknown) {
        setError((err as Error).message ?? 'Failed to load research')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isSignedIn, getToken])

  return { entry, loading, error }
}
