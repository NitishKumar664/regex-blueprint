'use client';

import { measure } from '@/lib/railroad';

export default function RailroadDiagram({ root }) {
  const { width, height, centerY, startX } = measure(root);
  const cmds = [];
  root.draw(startX, centerY, cmds);

  const svgW = Math.max(width, 240);
  const svgH = Math.max(height, 100);

  return (
    <svg
      className="diagram-svg"
      viewBox={`0 0 ${svgW} ${svgH}`}
      width={svgW}
      height={svgH}
      role="img"
      aria-label="Railroad diagram of the regular expression"
    >
      <defs>
        <pattern id="bp-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M 16 0 L 0 0 0 16" fill="none" className="grid-line" />
        </pattern>
        <marker id="bp-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="arrow-head" />
        </marker>
      </defs>
      <rect x="0" y="0" width={svgW} height={svgH} fill="url(#bp-grid)" />

      {/* entry / exit terminators */}
      <circle cx={startX - 8} cy={centerY} r="3" className="terminator" />
      <circle cx={svgW - 12} cy={centerY} r="3" className="terminator" />
      <line x1={startX - 8} y1={centerY} x2={startX} y2={centerY} className="stroke-literal" />

      {cmds.map((c, idx) => {
        if (c.t === 'line') {
          return (
            <line
              key={idx}
              x1={c.x1}
              y1={c.y1}
              x2={c.x2}
              y2={c.y2}
              className={`stroke-${c.kind}`}
              markerEnd={c.arrow ? 'url(#bp-arrow)' : undefined}
            />
          );
        }
        if (c.t === 'path') {
          return <path key={idx} d={c.d} className={`stroke-${c.kind}`} fill="none" />;
        }
        if (c.t === 'rect') {
          return (
            <rect
              key={idx}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              rx={c.kind === 'class' || c.kind === 'escape' || c.kind === 'any' ? 4 : 13}
              className={`box-${c.kind}`}
            />
          );
        }
        if (c.t === 'groupbox') {
          return (
            <g key={idx}>
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={3} className="group-box" />
              <text x={c.x + 8} y={c.y - 6} className="group-label">
                {c.label}
              </text>
            </g>
          );
        }
        if (c.t === 'text') {
          return (
            <text key={idx} x={c.x} y={c.y} textAnchor="middle" className={`label-${c.kind}`}>
              {c.label}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}
