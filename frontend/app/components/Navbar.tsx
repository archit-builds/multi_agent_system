'use client'

import { useAuth, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { isSignedIn, isLoaded } = useAuth()
  const pathname = usePathname()

  return (
    <nav className="app-nav">
      <div className="nav-inner">
        {/* Brand */}
        <Link href="/" className="nav-brand">
          <span className="nav-diamond">◆</span>
          <span className="nav-brand-text">Research Intelligence</span>
        </Link>

        {/* Right side */}
        <div className="nav-actions">
          {/* History link — only for signed-in users */}
          {isLoaded && isSignedIn && (
            <Link
              href="/history"
              className={`nav-link ${pathname.startsWith('/history') ? 'nav-link-active' : ''}`}
            >
              History
            </Link>
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

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 36px;
        }

        /* History link */
        .nav-link {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 5px 10px;
          border-radius: 7px;
          transition: all 0.15s;
          letter-spacing: 0.01em;
        }

        .nav-link:hover {
          color: var(--accent);
          background: var(--accent-light);
        }

        .nav-link-active {
          color: var(--accent);
          background: var(--accent-light);
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
  )
}
