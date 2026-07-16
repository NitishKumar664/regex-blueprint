'use client';

import { useMemo, useState } from 'react';
import { parseRegex, explainAst } from '@/lib/regexParser';
import { buildDiagram } from '@/lib/buildDiagram';
import RailroadDiagram from './RailroadDiagram';

const PRESETS = [
  { label: 'email', pattern: '[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}', flags: 'g' },
  { label: 'hex color', pattern: '#([0-9a-fA-F]{3}){1,2}', flags: 'g' },
  { label: 'ipv4', pattern: '(\\d{1,3}\\.){3}\\d{1,3}', flags: 'g' },
  { label: 'time (24h)', pattern: '([01]\\d|2[0-3]):[0-5]\\d', flags: 'g' },
];

const DEFAULT_TEST = `Reach the site team at ops@blueprint.dev or backup@site-42.io.
Palette refs: #1B3A5C and #fff. Server 10.0.0.12 checked in at 09:41 and 23:59.`;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useMemo(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return debounced;
}

export default function RegexPlayground() {
  const [pattern, setPattern] = useState(PRESETS[0].pattern);
  const [flagG, setFlagG] = useState(true);
  const [flagI, setFlagI] = useState(false);
  const [flagM, setFlagM] = useState(false);
  const [testString, setTestString] = useState(DEFAULT_TEST);

  const flags = (flagG ? 'g' : '') + (flagI ? 'i' : '') + (flagM ? 'm' : '');

  const ast = useMemo(() => {
    try {
      return parseRegex(pattern);
    } catch {
      return { type: 'seq', nodes: [] };
    }
  }, [pattern]);

  const diagram = useMemo(() => {
    try {
      return buildDiagram(ast);
    } catch {
      return buildDiagram({ type: 'seq', nodes: [] });
    }
  }, [ast]);

  const breakdown = useMemo(() => explainAst(ast), [ast]);

  const { matches, error, groupNames } = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
      const found = [];
      let m;
      let guard = 0;
      while ((m = re.exec(testString)) !== null && guard < 500) {
        found.push(m);
        guard++;
        if (m[0].length === 0) re.lastIndex++;
        if (!flags.includes('g')) break;
      }
      const names = new Set();
      found.forEach((m) => {
        if (m.groups) Object.keys(m.groups).forEach((k) => names.add(k));
      });
      return { matches: found, error: null, groupNames: [...names] };
    } catch (e) {
      return { matches: [], error: e.message, groupNames: [] };
    }
  }, [pattern, flags, testString]);

  const highlighted = useMemo(() => {
    if (error || matches.length === 0) return null;
    const parts = [];
    let cursor = 0;
    matches.forEach((m, idx) => {
      if (m.index > cursor) parts.push({ text: testString.slice(cursor, m.index), hit: false });
      parts.push({ text: m[0] || '', hit: true, idx });
      cursor = m.index + (m[0] ? m[0].length : 0);
    });
    if (cursor < testString.length) parts.push({ text: testString.slice(cursor), hit: false });
    return parts;
  }, [matches, testString, error]);

  return (
    <div className="playground">
      <section className="panel panel--controls">
        <div className="field-group">
          <label className="field-label" htmlFor="pattern">
            pattern
          </label>
          <div className={`pattern-row ${error ? 'has-error' : ''}`}>
            <span className="slash">/</span>
            <input
              id="pattern"
              className="pattern-input"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <span className="slash">/{flags}</span>
          </div>
          {error && <p className="error-text">⚠ {error}</p>}
        </div>

        <div className="flags-row">
          <span className="field-label">flags</span>
          <label className="flag-toggle">
            <input type="checkbox" checked={flagG} onChange={(e) => setFlagG(e.target.checked)} />
            <span>g — global</span>
          </label>
          <label className="flag-toggle">
            <input type="checkbox" checked={flagI} onChange={(e) => setFlagI(e.target.checked)} />
            <span>i — ignore case</span>
          </label>
          <label className="flag-toggle">
            <input type="checkbox" checked={flagM} onChange={(e) => setFlagM(e.target.checked)} />
            <span>m — multiline</span>
          </label>
        </div>

        <div className="presets-row">
          <span className="field-label">presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="preset-chip"
              onClick={() => {
                setPattern(p.pattern);
                setFlagG(p.flags.includes('g'));
              }}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="test-string">
            test string
          </label>
          <textarea
            id="test-string"
            className="test-input"
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            rows={5}
            spellCheck={false}
          />
        </div>

        <div className="match-summary">
          <span className="match-count">{matches.length}</span>
          <span className="match-count-label">
            match{matches.length === 1 ? '' : 'es'} {flags.includes('g') ? '' : '(first only — add g flag for all)'}
          </span>
        </div>

        {highlighted && (
          <div className="highlight-output">
            {highlighted.map((part, idx) =>
              part.hit ? (
                <mark key={idx} className="hit" title={`match ${part.idx + 1}`}>
                  {part.text}
                </mark>
              ) : (
                <span key={idx}>{part.text}</span>
              )
            )}
          </div>
        )}

        {matches.length > 0 && matches.some((m) => m.length > 1) && (
          <div className="groups-panel">
            <span className="field-label">captured groups — first match</span>
            <table className="groups-table">
              <tbody>
                {matches[0].slice(1).map((g, idx) => (
                  <tr key={idx}>
                    <td className="mono">${idx + 1}</td>
                    <td className="mono">{g === undefined ? '—' : `“${g}”`}</td>
                  </tr>
                ))}
                {groupNames.map((name) => (
                  <tr key={name}>
                    <td className="mono">{name}</td>
                    <td className="mono">
                      {matches[0].groups && matches[0].groups[name] !== undefined
                        ? `“${matches[0].groups[name]}”`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel panel--diagram">
        <div className="panel-heading">
          <span className="drawing-no">DWG · REGEX</span>
          <span className="scale-label">RAILROAD ELEVATION</span>
        </div>
        <div className="diagram-frame">
          <RailroadDiagram root={diagram} />
        </div>

        <div className="panel-heading panel-heading--parts">
          <span className="drawing-no">PARTS LIST</span>
          <span className="scale-label">TOKEN BREAKDOWN</span>
        </div>
        <ol className="parts-list">
          {breakdown.length === 0 && <li className="parts-empty">empty pattern</li>}
          {breakdown.map((item, idx) => (
            <li key={idx} style={{ marginLeft: item.depth * 16 }}>
              <span className="parts-label">{item.label}</span>
              {item.detail && <span className="parts-detail">{item.detail}</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
