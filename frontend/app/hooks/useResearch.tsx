'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { GraphNode, GraphEdge } from "../components/ResearchGraph"

export type StepKey = 'search_results' | 'scraped_content' | 'report' | 'feedback'
export type StatusKey =
  | 'idle' | 'search_started' | 'reading_started'
  | 'writing_started' | 'critiquing_started' | 'done' | 'error'

export interface ResearchState {
  status:          StatusKey
  message:         string
  search_results:  string
  scraped_content: string
  report:          string
  feedback:        string
  error:           string
  // Graph state
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const INITIAL: ResearchState = {
  status: 'idle', message: '',
  search_results: '', scraped_content: '',
  report: '', feedback: '', error: '',
  nodes: [], edges: [],
}

export function useResearch() {
  const [state, setState] = useState<ResearchState>(INITIAL)
  const abortRef = useRef<AbortController | null>(null)
  const { getToken, isSignedIn } = useAuth()

  const run = useCallback(async (topic: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setState({ ...INITIAL, status: 'search_started', message: '🔍 Initialising…' })

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (isSignedIn) {
        const token = await getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch('/api/research/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw)

            setState(prev => {
              const next = { ...prev }

              switch (event.step) {
                case 'status':
                  next.status  = event.data as StatusKey
                  next.message = event.message ?? ''
                  break

                case 'search_results':
                  next.search_results = event.data
                  next.message        = event.message ?? ''
                  break

                case 'scraped_content':
                  next.scraped_content = event.data
                  next.message         = event.message ?? ''
                  break

                case 'report':
                  next.report  = event.data
                  next.message = event.message ?? ''
                  break

                case 'feedback':
                  next.feedback = event.data
                  next.message  = event.message ?? ''
                  break

                case 'done':
                  next.status  = 'done'
                  next.message = event.message ?? 'Complete'
                  break

                case 'error':
                  next.status = 'error'
                  next.error  = event.data
                  break

                // ── Graph events ──────────────────────────────
                case 'node_add':
                  next.nodes = [...prev.nodes, event.node as GraphNode]
                  break

                case 'node_update': {
                  next.nodes = prev.nodes.map(n =>
                    n.id === event.id
                      ? { ...n, status: event.status, meta: { ...n.meta, ...event.meta } }
                      : n
                  )
                  break
                }

                case 'edge_add':
                  next.edges = [...prev.edges, event.edge as GraphEdge]
                  break
              }

              return next
            })
          } catch {
            // malformed line — ignore
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      setState(prev => ({ ...prev, status: 'error', error: (err as Error).message }))
    }
  }, [isSignedIn, getToken])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL)
  }, [])

  return { state, run, reset }
}