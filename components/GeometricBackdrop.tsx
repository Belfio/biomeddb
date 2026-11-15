/**
 * GeometricBackdrop — the signature element.
 *
 * A quiet, low-opacity SVG line-network sitting behind the home hero: faint grey
 * nodes connected by hairline-grey edges, evoking "datasets linked to disease
 * markers". Three edges are lit with a blue glow gradient (#0a84ff -> #5ac8fa).
 *
 * Calm by design: thin strokes, low opacity, absolutely positioned behind the
 * hero, pointer-events-none, aria-hidden. A very slow drift on the lit nodes is
 * disabled under prefers-reduced-motion (the @media block in globals.css zeroes
 * out animation durations globally).
 */

// Node coordinates on a 1200x520 canvas. A handful are "lit" (linked) nodes.
type Node = { x: number; y: number; r?: number; lit?: boolean }

const NODES: Node[] = [
  { x: 90, y: 90 },
  { x: 250, y: 230, lit: true, r: 3.5 },
  { x: 180, y: 400 },
  { x: 420, y: 120 },
  { x: 520, y: 320, lit: true, r: 3.5 },
  { x: 640, y: 90 },
  { x: 700, y: 420 },
  { x: 820, y: 250, lit: true, r: 4 },
  { x: 980, y: 130 },
  { x: 1050, y: 360 },
  { x: 1140, y: 200 },
  { x: 360, y: 480 },
  { x: 900, y: 470 },
]

// Hairline-grey structural edges (index pairs into NODES).
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [3, 5],
  [2, 11],
  [4, 6],
  [5, 7],
  [7, 8],
  [8, 10],
  [7, 9],
  [9, 12],
  [10, 9],
  [3, 4],
  [11, 6],
]

// The 2–3 lit edges, drawn with the blue glow gradient + a soft pulse.
const LIT_EDGES: [number, number][] = [
  [1, 4],
  [4, 7],
  [7, 10],
]

export function GeometricBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <svg
        viewBox="0 0 1200 520"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="bmd-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a84ff" />
            <stop offset="100%" stopColor="#5ac8fa" />
          </linearGradient>
          <filter id="bmd-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* Structural network — quiet hairline grey. */}
        <g stroke="var(--color-hairline)" strokeWidth="1" opacity="0.55">
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].x}
              y1={NODES[a].y}
              x2={NODES[b].x}
              y2={NODES[b].y}
            />
          ))}
        </g>

        {/* Lit edges — the one bold accent. Soft glow + very slow pulse. */}
        <g
          stroke="url(#bmd-glow)"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#bmd-soft)"
        >
          {LIT_EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].x}
              y1={NODES[a].y}
              x2={NODES[b].x}
              y2={NODES[b].y}
              opacity="0.7"
            >
              <animate
                attributeName="opacity"
                values="0.35;0.8;0.35"
                dur={`${7 + i * 1.5}s`}
                repeatCount="indefinite"
                begin={`${i * 0.8}s`}
              />
            </line>
          ))}
        </g>

        {/* Grey nodes. */}
        <g fill="var(--color-hairline)" opacity="0.7">
          {NODES.filter((n) => !n.lit).map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r ?? 2.5} />
          ))}
        </g>

        {/* Lit nodes — small blue glow points along the highlighted path. */}
        <g fill="url(#bmd-glow)">
          {NODES.filter((n) => n.lit).map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r ?? 3.5}>
              <animate
                attributeName="opacity"
                values="0.6;1;0.6"
                dur={`${6 + i}s`}
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
              />
            </circle>
          ))}
        </g>
      </svg>

      {/* Fade the network into the page so it never competes with the hero. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
    </div>
  )
}
