'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NodeType   = 'topic' | 'agent' | 'source' | 'output' | 'score'
export type NodeStatus = 'pending' | 'active' | 'done' | 'error' | 'selected' | 'found'

export interface GraphNode {
  id:      string
  type:    NodeType
  label:   string
  status:  NodeStatus
  meta?:   Record<string, unknown>
  x?:      number
  y?:      number
}

export interface GraphEdge {
  id:   string
  from: string
  to:   string
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ── Layout engine ─────────────────────────────────────────────────────────────
// Assigns x/y positions based on node type so the graph flows top-down.

const LAYER_Y: Record<NodeType, number> = {
  topic:  60,
  agent:  180,
  source: 320,
  output: 460,
  score:  560,
}

// Agent nodes have fixed x positions
const AGENT_X: Record<string, number> = {
  'search-agent': 340,
  'reader-agent': 340,
  'writer':       340,
  'critic':       340,
}

function layoutNodes(nodes: GraphNode[]): GraphNode[] {
  // Count sources to spread them evenly
  const sources  = nodes.filter(n => n.type === 'source' && n.id.startsWith('src-'))
  const nSources = sources.length
  const spacing  = 110
  const totalW   = Math.max((nSources - 1) * spacing, 0)
  const startX   = 340 - totalW / 2

  let unknownAgentIndex = 0

  return nodes.map(node => {
    if (node.x !== undefined) return node // already positioned

    let x = 340
    let y = 300

    if (node.type === 'topic') {
      y = 60
    } else if (node.id === 'search-agent') {
      y = 160
    } else if (node.id.startsWith('src-')) {
      const idx = sources.findIndex(s => s.id === node.id)
      x = startX + idx * spacing
      y = 260
    } else if (node.id === 'reader-agent') {
      y = 360
    } else if (node.id === 'scraped') {
      y = 460
    } else if (node.id === 'writer') {
      y = 560
    } else if (node.id === 'report-node') {
      y = 660
    } else if (node.id === 'critic') {
      y = 760
    } else if (node.id === 'score-node') {
      y = 860
    } else {
      // Fallback for any unknown nodes
      if (node.type === 'agent') {
        y = 960 + (unknownAgentIndex++) * 100
      } else {
        y = 1060
      }
    }

    return { ...node, x, y }
  })
}

// ── Colours per node type/status ──────────────────────────────────────────────

function nodeColors(type: NodeType, status: NodeStatus) {
  if (status === 'active') return { fill: '#eef4ee', stroke: '#3d6b3d', text: '#2a4e2a', pulse: true }
  if (status === 'error')  return { fill: '#fef2f2', stroke: '#c0392b', text: '#7b1d1d', pulse: false }

  switch (type) {
    case 'topic':  return { fill: '#f0ede8', stroke: '#9a8f82', text: '#1a1410', pulse: false }
    case 'agent':
      if (status === 'done') return { fill: '#eef4ee', stroke: '#82ab82', text: '#2a4e2a', pulse: false }
      return { fill: '#f8f8f6', stroke: '#cfc8be', text: '#5a5047', pulse: false }
    case 'source':
      if (status === 'selected') return { fill: '#eef4ee', stroke: '#3d6b3d', text: '#2a4e2a', pulse: false }
      if (status === 'found')    return { fill: '#f2ede6', stroke: '#c0b8ae', text: '#5a5047', pulse: false }
      return { fill: '#f8f8f6', stroke: '#e2dbd2', text: '#9a8f82', pulse: false }
    case 'output': return { fill: '#f0f4fe', stroke: '#7b9ef0', text: '#1e3a8a', pulse: false }
    case 'score':  return { fill: '#fefce8', stroke: '#ca8a04', text: '#713f12', pulse: false }
    default:       return { fill: '#f8f8f6', stroke: '#e2dbd2', text: '#5a5047', pulse: false }
  }
}

// ── Node shape ────────────────────────────────────────────────────────────────

function NodeOverlay({ status, type, stroke, w }: {
  status: NodeStatus; type: NodeType; stroke: string; w: number
}): React.ReactElement | null {
  if (status === 'active') {
    return (
      <circle
        cx={-w / 2 + 14} cy={0} r={6}
        fill="none" stroke="#3d6b3d" strokeWidth={1.5}
        strokeDasharray="20 8"
        style={{ animation: 'spin 0.9s linear infinite', transformOrigin: `${-w / 2 + 14}px 0px` }}
      />
    )
  }
  if (status === 'done' && type === 'agent') {
    return <text x={-w / 2 + 14} y={5} fontSize={11} fill={stroke} textAnchor="middle">✓</text>
  }
  return null
}

function NodeShape({
  node, onClick, selected,
}: {
  node: GraphNode
  onClick: (n: GraphNode) => void
  selected: boolean
}) {
  const { fill, stroke, text, pulse } = nodeColors(node.type, node.status)
  const x = node.x ?? 340
  const y = node.y ?? 200

  const w = node.type === 'topic' ? 180 : node.type === 'score' ? 140 : 160
  const h = node.type === 'agent' ? 48 : 38
  const rx = node.type === 'score' ? 99 : 8

  const truncated = node.label.length > 22
    ? node.label.slice(0, 21) + '…'
    : node.label

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(node)}
    >
      {/* Pulse ring for active nodes */}
      {pulse && (
        <rect
          x={-w / 2 - 4} y={-h / 2 - 4}
          width={w + 8} height={h + 8}
          rx={rx + 2}
          fill="none"
          stroke="#3d6b3d"
          strokeWidth={1}
          opacity={0.3}
          style={{ animation: 'pulseRing 1.4s ease-in-out infinite' }}
        />
      )}

      {/* Selection ring */}
      {selected && (
        <rect
          x={-w / 2 - 3} y={-h / 2 - 3}
          width={w + 6} height={h + 6}
          rx={rx + 1}
          fill="none"
          stroke="#3d6b3d"
          strokeWidth={2}
          opacity={0.6}
        />
      )}

      {/* Main box */}
      <rect
        x={-w / 2} y={-h / 2}
        width={w} height={h}
        rx={rx}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 2 : 1.5}
      />

      {/* Spinner or checkmark */}
      <NodeOverlay status={node.status} type={node.type} stroke={stroke} w={w} />

      {/* Label */}
      <text
        x={node.status === 'active' || (node.status === 'done' && node.type === 'agent') ? 8 : 0}
        y={5}
        fontSize={node.type === 'topic' ? 13 : 12}
        fontWeight={node.type === 'topic' || node.type === 'agent' ? '500' : '400'}
        fill={text}
        textAnchor="middle"
        fontFamily="Geist, system-ui, sans-serif"
      >
        {truncated}
      </text>

      {/* Meta badge — elapsed time */}
      {!!node.meta?.elapsed && node.status === 'done' && (
        <text x={w / 2 - 4} y={-h / 2 + 12} fontSize={9} fill="#9a8f82" textAnchor="end">
          {String(node.meta.elapsed)}
        </text>
      )}
    </g>
  )
}

// ── Animated edge ─────────────────────────────────────────────────────────────

function AnimatedEdge({ edge, nodes }: { edge: GraphEdge; nodes: GraphNode[] }) {
  const from = nodes.find(n => n.id === edge.from)
  const to   = nodes.find(n => n.id === edge.to)
  if (!from || !to || from.x === undefined || to.x === undefined) return null

  const x1 = from.x ?? 340
  const y1 = (from.y ?? 200) + 20
  const x2 = to.x   ?? 340
  const y2 = (to.y  ?? 200) - 20

  // Curved path
  let cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  
  // Curve edges that jump a layer vertically so they don't intersect intermediate nodes
  if (Math.abs(x1 - x2) < 10 && Math.abs(y2 - y1) > 150) {
    cx = x1 + 120
  }

  const d  = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#cfc8be"
        strokeWidth={1.5}
        strokeDasharray="400"
        strokeDashoffset="400"
        style={{ animation: 'drawEdge 0.5s ease forwards' }}
      />
      {/* Arrow head */}
      <polygon
        points={`${x2},${y2} ${x2 - 4},${y2 - 8} ${x2 + 4},${y2 - 8}`}
        fill="#cfc8be"
        style={{ animation: 'fadeIn 0.3s ease 0.4s both' }}
      />
    </g>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const meta = node.meta ?? {}
  return (
    <div style={{
      position: 'absolute', top: 12, right: 12,
      width: 220,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '1rem',
      zIndex: 10,
      animation: 'slideIn 0.2s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{node.label}</span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, color: 'var(--text-muted)', lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Row label="Type"   value={node.type} />
        <Row label="Status" value={node.status} />
        {!!meta.elapsed     && <Row label="Time"    value={String(meta.elapsed)} />}
        {!!meta.words       && <Row label="Words"   value={String(meta.words)} />}
        {!!meta.score       && <Row label="Score"   value={`${String(meta.score)}/10`} />}
        {!!meta.chars       && <Row label="Scraped" value={`${Number(meta.chars).toLocaleString()} chars`} />}
        {!!meta.sources_found && <Row label="Sources" value={String(meta.sources_found)} />}
        {!!meta.url && (
          <div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>URL</span>
            <a
              href={String(meta.url)} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: 'var(--accent)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}
            >
              {String(meta.url).slice(0, 60)}{String(meta.url).length > 60 ? '…' : ''}
            </a>
          </div>
        )}
        {!!meta.description && (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {String(meta.description)}
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResearchGraph({ nodes, edges }: Props) {
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const laid = layoutNodes(nodes)

  // SVG viewBox — expand as more nodes appear
  const maxY = Math.max(...laid.map(n => n.y ?? 60), 400) + 80
  const viewBox = `0 0 680 ${maxY}`

  if (nodes.length === 0) return null

  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-elevated)',
      border: '1.5px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      padding: '0.5rem 0',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1.25rem 0.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-surface)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>◆</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Agent Graph — live
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 10,
          color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
        }}>
          click any node for details
        </span>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        width="100%"
        style={{ display: 'block', transition: 'height 0.4s ease' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            @keyframes drawEdge {
              to { stroke-dashoffset: 0; }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes nodeIn {
              from { opacity: 0; transform: scale(0.7); }
              to   { opacity: 1; transform: scale(1);   }
            }
            @keyframes pulseRing {
              0%, 100% { opacity: 0.2; transform: scale(1);    }
              50%       { opacity: 0.5; transform: scale(1.04); }
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateX(8px); }
              to   { opacity: 1; transform: translateX(0);   }
            }
            .graph-node {
              animation: nodeIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
            }
          `}</style>
        </defs>

        {/* Edges — render below nodes */}
        {edges.map(edge => (
          <AnimatedEdge key={edge.id} edge={edge} nodes={laid} />
        ))}

        {/* Nodes */}
        {laid.map(node => (
          <g key={node.id} className="graph-node">
            <NodeShape
              node={node}
              onClick={setSelected}
              selected={selected?.id === node.id}
            />
          </g>
        ))}
      </svg>

      {/* Detail panel */}
      {selected && (
        <DetailPanel node={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}