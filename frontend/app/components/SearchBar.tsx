'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface SearchBarProps {
  onSearch: (topic: string) => void
  isLoading: boolean
  onReset: () => void
}

const EXAMPLE_TOPICS = [
  'Quantum computing breakthroughs 2025',
  'The future of autonomous vehicles',
  'CRISPR gene editing in medicine',
  'Rise of AI-generated art and copyright',
]

export default function SearchBar({ onSearch, isLoading, onReset }: SearchBarProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const topic = value.trim()
    if (!topic || isLoading) return
    onSearch(topic)
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExample = (t: string) => {
    setValue(t)
    inputRef.current?.focus()
  }

  const handleClear = () => {
    setValue('')
    onReset()
    inputRef.current?.focus()
  }

  return (
    <div className="search-wrap">
      <div className="input-shell" data-loading={isLoading}>
        <textarea
          ref={inputRef}
          className="topic-input"
          placeholder="Enter a research topic…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          disabled={isLoading}
          aria-label="Research topic"
        />

        <div className="input-footer">
          <span className="hint">↵ Enter to search</span>
          <div className="action-row">
            {(value || isLoading) && (
              <button className="btn-ghost" onClick={handleClear} aria-label="Clear">
                Clear
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading}
              aria-label="Start research"
            >
              {isLoading ? (
                <span className="btn-loading">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              ) : (
                'Research →'
              )}
            </button>
          </div>
        </div>
      </div>

      {!isLoading && (
        <div className="examples">
          <span className="examples-label">Try:</span>
          {EXAMPLE_TOPICS.map((t) => (
            <button key={t} className="example-chip" onClick={() => handleExample(t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .search-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .input-shell {
          background: var(--bg-elevated);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .input-shell:focus-within {
          border-color: var(--accent-mid);
          box-shadow: 0 0 0 3px rgba(130, 171, 130, 0.15);
        }

        .input-shell[data-loading='true'] {
          border-color: var(--border);
          opacity: 0.7;
        }

        .topic-input {
          width: 100%;
          padding: 1.1rem 1.25rem 0.5rem;
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--text-primary);
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          line-height: 1.5;
        }

        .topic-input::placeholder {
          color: var(--text-muted);
          font-style: italic;
        }

        .input-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 1rem 0.75rem;
          border-top: 1px solid var(--bg-surface);
        }

        .hint {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-ghost {
          font-size: 13px;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }

        .btn-ghost:hover {
          color: var(--text-secondary);
          background: var(--bg-surface);
        }

        .btn-primary {
          background: var(--accent);
          color: white;
          border: none;
          padding: 7px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          letter-spacing: 0.02em;
          min-width: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-primary:hover:not(:disabled) {
          opacity: 0.88;
        }

        .btn-primary:active:not(:disabled) {
          transform: scale(0.97);
        }

        .btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .examples {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          animation: fadeUp 0.4s ease;
        }

        .examples-label {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          flex-shrink: 0;
        }

        .example-chip {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 100px;
          padding: 4px 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          line-height: 1.4;
        }

        .example-chip:hover {
          background: var(--accent-light);
          border-color: var(--accent-mid);
          color: var(--accent);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}