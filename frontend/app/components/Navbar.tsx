'use client'

import { useAuth, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <nav className="app-nav">
      <div className="nav-inner">
        <span className="nav-brand">
          <span className="nav-diamond">◆</span>
          <span className="nav-brand-text">Research Intelligence</span>
        </span>

        <div className="nav-actions">
          {/* Show nothing until Clerk has hydrated */}
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
          background: rgba(250, 248, 245, 0.88);
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

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 8px;
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
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
        }

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
  )
}
