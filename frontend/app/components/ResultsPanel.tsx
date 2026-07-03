"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResearchState } from "../hooks/useResearch";

interface ResultsPanelProps {
  state: ResearchState;
}

type TabId = "report" | "critique" ;

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  available: (s: ResearchState) => boolean;
}

const TABS: Tab[] = [
  { id: "report", label: "Report", icon: "◇", available: (s) => !!s.report },
  {
    id: "critique",
    label: "Critique",
    icon: "◈",
    available: (s) => !!s.feedback,
  },
  
];

function ScoreBadge({ text }: { text: string }) {
  const match = text.match(/Score:\s*(\d+)\/10/);
  if (!match) return null;
  const score = parseInt(match[1]);
  const color = score >= 8 ? "#3d6b3d" : score >= 6 ? "#c07c2a" : "#c0392b";
  return (
    <div
      className="score-badge"
      style={{ "--score-color": color } as React.CSSProperties}
    >
      <span className="score-num">{score}</span>
      <span className="score-denom">/10</span>
      <style jsx>{`
        .score-badge {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          padding: 6px 16px;
          background: color-mix(in srgb, var(--score-color) 10%, transparent);
          border: 1px solid
            color-mix(in srgb, var(--score-color) 30%, transparent);
          border-radius: 100px;
          margin-bottom: 1.5rem;
        }
        .score-num {
          font-family: var(--font-display);
          font-size: 1.6rem;
          color: var(--score-color);
          line-height: 1;
        }
        .score-denom {
          font-size: 0.85rem;
          color: var(--score-color);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

function ShimmerBlock() {
  return (
    <div className="shimmer-block">
      {[100, 80, 95, 70, 88, 60].map((w, i) => (
        <div
          key={i}
          className="shimmer-line"
          style={{ width: `${w}%`, height: 14, marginBottom: 10 }}
        />
      ))}
      <style jsx>{`
        .shimmer-block {
          padding: 0.5rem 0;
        }
        .shimmer-line {
          background: linear-gradient(
            90deg,
            var(--bg-surface) 25%,
            var(--border) 50%,
            var(--bg-surface) 75%
          );
          background-size: 800px 100%;
          animation: shimmer 1.8s ease-in-out infinite;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% {
            background-position: -400px 0;
          }
          100% {
            background-position: 400px 0;
          }
        }
      `}</style>
    </div>
  );
}

function CritiqueView({ text }: { text: string }) {
  return (
    <div className="critique-view">
      <ScoreBadge text={text} />
      <div className="prose-report">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      <style jsx>{`
        .critique-view {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}

function SourcesView({ raw }: { raw: string }) {
  // Extract URLs from raw text
  const urlRegex = /https?:\/\/[^\s"'<>)\]]+/g;
  const urls = Array.from(new Set(raw.match(urlRegex) || []));

  if (!urls.length) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        No URLs extracted from search results.
      </p>
    );
  }

  return (
    <div className="sources-list">
      {urls.map((url, i) => {
        let host = "";
        try {
          host = new URL(url).hostname.replace("www.", "");
        } catch {}
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-item"
          >
            <span className="source-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="source-detail">
              <span className="source-host">{host}</span>
              <span className="source-url">{url}</span>
            </div>
            <span className="source-arrow">↗</span>
          </a>
        );
      })}
      <style jsx>{`
        .sources-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .source-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .source-item:hover {
          background: var(--accent-light);
          border-color: var(--accent-mid);
        }
        .source-index {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .source-detail {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .source-host {
          font-size: 13px;
          font-weight: 500;
          color: var(--accent);
        }
        .source-url {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .source-arrow {
          font-size: 14px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

export default function ResultsPanel({ state }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("report");

  const hasAnyContent = state.report || state.feedback || state.search_results;
  const isWriting = state.status === "writing_started";
  const isCritiquing = state.status === "critiquing_started";
  const isSearching = ["search_started", "reading_started"].includes(
    state.status,
  );

  if (!hasAnyContent && !isSearching && !isWriting && !isCritiquing)
    return null;

  return (
    <div className="results-panel">
      {/* Tab bar */}
      <div className="tab-bar" role="tablist">
        {TABS.map((tab) => {
          const available = tab.available(state);
          const isLoading =
            (!available &&
              tab.id === "report" &&
              (isWriting || isCritiquing)) ||
            (!available && tab.id === "critique" && isCritiquing);

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""} ${!available && !isLoading ? "disabled" : ""}`}
              onClick={() => available && setActiveTab(tab.id)}
              disabled={!available && !isLoading}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
              {isLoading && <span className="tab-spinner" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === "report" && (
          <>
            {state.report ? (
              <div className="prose-report animate-fade-in">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {state.report}
                </ReactMarkdown>
              </div>
            ) : (
              <ShimmerBlock />
            )}
          </>
        )}

        {activeTab === "critique" && (
          <>
            {state.feedback ? (
              <div className="animate-fade-in">
                <CritiqueView text={state.feedback} />
              </div>
            ) : (
              <ShimmerBlock />
            )}
          </>
        )}

    
      </div>

      <style jsx>{`
        .results-panel {
          width: 100%;
          background: var(--bg-elevated);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          animation: fadeUp 0.5s ease;
        }

        .tab-bar {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: var(--bg-surface);
          padding: 0 0.5rem;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          cursor: pointer;
          transition: all 0.15s ease;
          letter-spacing: 0.02em;
        }

        .tab-btn:hover:not(.disabled):not(.active) {
          color: var(--text-secondary);
        }

        .tab-btn.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }

        .tab-btn.disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .tab-icon {
          font-size: 10px;
        }

        .tab-spinner {
          width: 10px;
          height: 10px;
          border: 1.5px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .tab-content {
          padding: 1.75rem 2rem;
          min-height: 200px;
        }

        .animate-fade-in {
          animation: fadeUp 0.4s ease;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
