'use client'

import { useState } from 'react'
import { useAuth, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import HistorySidebar from './HistorySidebar'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* ── Sidebar (rendered at root level, outside nav flow) ── */}
      {isLoaded && isSignedIn && (
        <HistorySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <nav className="app-nav">
        <div className="nav-inner">
          {/* Brand */}
          <Link href="/" className="nav-brand">
            <span className="nav-diamond">◆</span>
            <span className="nav-brand-text">Research Intelligence</span>
          </Link>

          {/* Right side */}
          <div className="nav-actions">
            {/* History toggle — only for signed-in users */}
            {isLoaded && isSignedIn && (
              <button
                className={`nav-history-btn ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(v => !v)}
                id="nav-history-btn"
                title="Toggle research history"
              >
                <span className="history-icon">◈</span>
                History
              </button>
            )}

            {/* Auth buttons */}
            {isLoaded && !isSignedIn && (
              <>
                <SignInButton mode="modal">
                  <button className="nav-btn nav-btn-ghost" id="nav-signin-btn">Sign in</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="nav-btn nav-btn-primary" id="nav-signup-btn">Sign up</button>
                </SignUpButton>
              </>
            )}

            {isLoaded && isSignedIn && (
              <UserButton />
            )}
          </div>
        </div>

        <style jsx>{`
          .app-nav {
            position: sticky;
            top: 0;
            z-index: 50;
            background: rgba(250, 248, 245, 0.92);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
          }

          .nav-inner {
            max-width: 820px;
            margin: 0 auto;
            padding: 0.75rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          /* Brand */
          .nav-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
          }

          .nav-diamond {
            font-size: 1.05rem;
            color: var(--accent);
          }

          .nav-brand-text {
            font-family: var(--font-display);
            font-size: 1rem;
            font-weight: 400;
            color: var(--text-primary);
            letter-spacing: 0.01em;
            transition: color 0.15s;
          }

          .nav-brand:hover .nav-brand-text {
            color: var(--accent);
          }

          /* Actions */
          .nav-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            min-height: 36px;
          }

          /* History toggle button */
          .nav-history-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 5px 12px;
            cursor: pointer;
            transition: all 0.15s;
            font-family: var(--font-body);
            letter-spacing: 0.01em;
          }

          .nav-history-btn:hover {
            color: var(--accent);
            background: var(--accent-light);
            border-color: var(--accent-mid);
          }

          .nav-history-btn.active {
            color: var(--accent);
            background: var(--accent-light);
            border-color: var(--accent-mid);
          }

          .history-icon {
            font-size: 11px;
            color: var(--accent-mid);
            transition: color 0.15s;
          }

          .nav-history-btn:hover .history-icon,
          .nav-history-btn.active .history-icon {
            color: var(--accent);
          }

          /* Auth buttons */
          .nav-btn {
            font-size: 13px;
            font-weight: 500;
            border: none;
            border-radius: 8px;
            padding: 6px 14px;
            cursor: pointer;
            transition: all 0.15s ease;
            font-family: var(--font-body);
            letter-spacing: 0.01em;
          }

          .nav-btn-ghost {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border);
          }

          .nav-btn-ghost:hover {
            background: var(--bg-surface);
            color: var(--text-primary);
            border-color: var(--border-strong);
          }

          .nav-btn-primary {
            background: var(--accent);
            color: #fff;
          }

          .nav-btn-primary:hover {
            opacity: 0.88;
          }
        `}</style>
      </nav>
    </>
  )
}
