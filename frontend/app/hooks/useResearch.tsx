'use client'

import { useState, useCallback, useRef } from 'react'

export type StepKey = 'search_results' | 'scraped_content' | 'report' | 'feedback'
export type StatusKey =
  | 'idle'
  | 'search_started'
  | 'reading_started'
  | 'writing_started'
  | 'critiquing_started'
  | 'done'
  | 'error'

export interface ResearchState {
  status: StatusKey
  message: string
  search_results: string
  scraped_content: string
  report: string
  feedback: string
  error: string
}

const INITIAL: ResearchState = {
  status: 'idle',
  message: '',
  search_results: '',
  scraped_content: '',
  report: '',
  feedback: '',
  error: '',
}

export function useResearch() {
  const [state, setState] = useState<ResearchState>(INITIAL)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async (topic: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setState({ ...INITIAL, status: 'search_started', message: '🔍 Initialising search…' })

    try {
      const res = await fetch('/api/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
            const event = JSON.parse(raw) as {
              step: string
              data: string
              message?: string
            }

            setState((prev) => {
              const next = { ...prev }

              if (event.step === 'status') {
                next.status = event.data as StatusKey
                next.message = event.message ?? ''
              } else if (event.step === 'search_results') {
                next.search_results = event.data
                next.message = event.message ?? ''
              } else if (event.step === 'scraped_content') {
                next.scraped_content = event.data
                next.message = event.message ?? ''
              } else if (event.step === 'report') {
                next.report = event.data
                next.message = event.message ?? ''
              } else if (event.step === 'feedback') {
                next.feedback = event.data
                next.message = event.message ?? ''
              } else if (event.step === 'done') {
                next.status = 'done'
                next.message = event.message ?? 'Complete'
              } else if (event.step === 'error') {
                next.status = 'error'
                next.error = event.data
              }

              return next
            })
          } catch {
            // malformed JSON line — ignore
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: (err as Error).message ?? 'Unknown error',
      }))
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL)
  }, [])

  return { state, run, reset }
}