'use client'

import { StatusKey } from '../hooks/useResearch'

interface Step {
  id: StatusKey
  label: string
  icon: string
  description: string
}

const STEPS: Step[] = [
  { id: 'search_started',    label: 'Search',   icon: '◎', description: 'Scanning the web for relevant sources' },
  { id: 'reading_started',   label: 'Read',     icon: '◈', description: 'Scraping and extracting content' },
  { id: 'writing_started',   label: 'Write',    icon: '◇', description: 'Drafting the research report' },
  { id: 'critiquing_started',label: 'Critique', icon: '◆', description: 'Evaluating quality and scoring' },
]

const STATUS_ORDER: StatusKey[] = [
  'idle',
  'search_started',
  'reading_started',
  'writing_started',
  'critiquing_started',
  'done',
]

function getStepState(stepId: StatusKey, currentStatus: StatusKey): 'pending' | 'active' | 'done' {
  const stepIdx    = STATUS_ORDER.indexOf(stepId)
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)

  if (currentStatus === 'error') return stepIdx < currentIdx ? 'done' : 'pending'
  if (currentIdx > stepIdx)  return 'done'
  if (currentIdx === stepIdx) return 'active'
  return 'pending'
}

export default function PipelineTracker({ status, message }: { status: StatusKey; message: string }) {
  if (status === 'idle') return null

  return (
    <div className="pipeline-tracker">
      <div className="steps-row">
        {STEPS.map((step, i) => {
          const state = getStepState(step.id, status)
          return (
            <div key={step.id} className="step-item">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className="connector"
                  data-state={getStepState(STEPS[i - 1].id, status) === 'done' ? 'done' : 'pending'}
                />
              )}

              {/* Node */}
              <div className="step-node" data-state={state}>
                {state === 'active' ? (
                  <span className="spinner" />
                ) : state === 'done' ? (
                  <span className="checkmark">✓</span>
                ) : (
                  <span className="step-num">{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <div className="step-label" data-state={state}>
                <span className="label-text">{step.label}</span>
                {state === 'active' && (
                  <span className="label-desc">{step.description}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Live message */}
      {message && status !== 'done' && status !== 'error' && (
        <div className="live-message">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="msg-text">{message.replace(/^[^\w]*/, '')}</span>
        </div>
      )}

      {status === 'done' && (
        <div className="done-banner">
          Research complete — all four agents finished successfully.
        </div>
      )}

      {status === 'error' && (
        <div className="error-banner">
          Something went wrong. Please try again.
        </div>
      )}

      <style jsx>{`
        .pipeline-tracker {
          width: 100%;
          padding: 2rem 0 0;
        }

        .steps-row {
          display: flex;
          align-items: flex-start;
          gap: 0;
          position: relative;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
          gap: 10px;
        }

        .connector {
          position: absolute;
          top: 16px;
          right: 50%;
          width: 100%;
          height: 1px;
          background: var(--border);
          transition: background 0.4s ease;
        }

        .connector[data-state='done'] {
          background: var(--accent-mid);
        }

        .step-node {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
          border: 1.5px solid var(--border);
          background: var(--bg-base);
          color: var(--text-muted);
        }

        .step-node[data-state='active'] {
          border-color: var(--accent);
          background: var(--accent-light);
          color: var(--accent);
        }

        .step-node[data-state='done'] {
          border-color: var(--accent-mid);
          background: var(--accent-mid);
          color: white;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--accent-light);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .checkmark { font-size: 13px; }
        .step-num  { font-size: 11px; font-family: var(--font-mono); }

        .step-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .label-text {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          transition: color 0.3s;
        }

        .step-node[data-state='active'] ~ .step-label .label-text,
        .step-label[data-state='active'] .label-text {
          color: var(--accent);
        }

        .step-node[data-state='done'] ~ .step-label .label-text,
        .step-label[data-state='done'] .label-text {
          color: var(--text-secondary);
        }

        .label-desc {
          font-size: 10px;
          color: var(--text-muted);
          text-align: center;
          max-width: 100px;
          line-height: 1.3;
          animation: fadeUp 0.3s ease forwards;
        }

        .live-message {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 1.5rem;
          padding: 0.6rem 1rem;
          background: var(--bg-surface);
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .msg-text {
          font-size: 13px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        .done-banner {
          margin-top: 1.25rem;
          font-size: 12px;
          color: var(--accent);
          text-align: center;
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
          animation: fadeUp 0.4s ease;
        }

        .error-banner {
          margin-top: 1.25rem;
          font-size: 12px;
          color: #c0392b;
          text-align: center;
          font-family: var(--font-mono);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  )
}