// A small recursive-descent parser for a practical subset of JS regex syntax.
// It never throws on unsupported constructs it doesn't recognize — it falls
// back to treating them as literal text so the diagram always renders.

export function parseRegex(pattern) {
  let i = 0;
  const n = pattern.length;

  const peek = () => pattern[i];
  const eof = () => i >= n;

  function parseAlternation() {
    const branches = [parseSequence()];
    while (!eof() && peek() === '|') {
      i++;
      branches.push(parseSequence());
    }
    if (branches.length === 1) return branches[0];
    return { type: 'alt', branches };
  }

  function parseSequence() {
    const nodes = [];
    while (!eof() && peek() !== '|' && peek() !== ')') {
      nodes.push(parseQuantified());
    }
    return { type: 'seq', nodes };
  }

  function parseQuantified() {
    const atom = parseAtom();
    if (eof()) return atom;
    const q = peek();

    if (q === '*' || q === '+' || q === '?') {
      i++;
      let lazy = false;
      if (peek() === '?') {
        lazy = true;
        i++;
      }
      let min, max;
      if (q === '*') {
        min = 0;
        max = Infinity;
      } else if (q === '+') {
        min = 1;
        max = Infinity;
      } else {
        min = 0;
        max = 1;
      }
      return { type: 'repeat', node: atom, min, max, lazy, symbol: q };
    }

    if (q === '{') {
      const m = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
      if (m) {
        i += m[0].length;
        const min = parseInt(m[1], 10);
        const max = m[2] !== undefined ? (m[3] ? parseInt(m[3], 10) : Infinity) : min;
        let lazy = false;
        if (peek() === '?') {
          lazy = true;
          i++;
        }
        return { type: 'repeat', node: atom, min, max, lazy, symbol: m[0] };
      }
    }

    return atom;
  }

  function parseAtom() {
    const c = peek();

    if (c === '(') {
      i++;
      let kind = 'capture';
      let name = null;

      if (peek() === '?') {
        i++;
        if (peek() === ':') {
          kind = 'noncap';
          i++;
        } else if (peek() === '=') {
          kind = 'lookahead';
          i++;
        } else if (peek() === '!') {
          kind = 'neglookahead';
          i++;
        } else if (peek() === '<') {
          i++;
          if (peek() === '=') {
            kind = 'lookbehind';
            i++;
          } else if (peek() === '!') {
            kind = 'neglookbehind';
            i++;
          } else {
            const start = i;
            while (!eof() && peek() !== '>') i++;
            name = pattern.slice(start, i);
            if (peek() === '>') i++;
            kind = 'capture';
          }
        }
      }

      const inner = parseAlternation();
      if (peek() === ')') i++;
      return { type: 'group', kind, name, node: inner };
    }

    if (c === '[') {
      const start = i;
      i++;
      if (peek() === '^') i++;
      if (peek() === ']') i++; // a leading ] is literal inside a class
      while (!eof() && peek() !== ']') {
        if (peek() === '\\') i++;
        i++;
      }
      if (peek() === ']') i++;
      const raw = pattern.slice(start, i);
      return { type: 'class', raw };
    }

    if (c === '.') {
      i++;
      return { type: 'any' };
    }
    if (c === '^') {
      i++;
      return { type: 'anchor', kind: 'start' };
    }
    if (c === '$') {
      i++;
      return { type: 'anchor', kind: 'end' };
    }
    if (c === '\\') {
      i++;
      const e = peek();
      i++;
      return { type: 'escape', char: e };
    }

    i++;
    return { type: 'literal', char: c };
  }

  try {
    if (n === 0) return { type: 'seq', nodes: [] };
    return parseAlternation();
  } catch (err) {
    return { type: 'seq', nodes: [{ type: 'literal', char: pattern }] };
  }
}

const ESCAPE_LABELS = {
  d: 'digit 0–9',
  D: 'not a digit',
  w: 'word character',
  W: 'not a word character',
  s: 'whitespace',
  S: 'not whitespace',
  b: 'word boundary',
  B: 'not a word boundary',
  n: 'newline',
  t: 'tab',
  r: 'carriage return',
  0: 'null character',
};

export function escapeLabel(char) {
  if (ESCAPE_LABELS[char]) return ESCAPE_LABELS[char];
  return `literal “${char}”`;
}

// Flattens the AST into an ordered, human-readable breakdown for the
// parts-list panel.
export function explainAst(node, out = [], depth = 0) {
  if (!node) return out;
  switch (node.type) {
    case 'seq':
      node.nodes.forEach((child) => explainAst(child, out, depth));
      break;
    case 'alt':
      out.push({ label: 'either of', detail: `${node.branches.length} alternatives`, depth });
      node.branches.forEach((b, idx) => {
        out.push({ label: `branch ${idx + 1}`, detail: '', depth: depth + 1 });
        explainAst(b, out, depth + 2);
      });
      break;
    case 'repeat': {
      let times;
      if (node.symbol === '*') times = 'zero or more times';
      else if (node.symbol === '+') times = 'one or more times';
      else if (node.symbol === '?') times = 'zero or one time';
      else if (node.max === Infinity) times = `${node.min} or more times`;
      else if (node.min === node.max) times = `exactly ${node.min} time${node.min === 1 ? '' : 's'}`;
      else times = `${node.min}–${node.max} times`;
      out.push({ label: 'repeat', detail: `${times}${node.lazy ? ', lazily' : ''}`, depth });
      explainAst(node.node, out, depth + 1);
      break;
    }
    case 'group': {
      const kindLabel = {
        capture: node.name ? `capture group “${node.name}”` : 'capture group',
        noncap: 'group (not captured)',
        lookahead: 'lookahead — must be followed by',
        neglookahead: 'negative lookahead — must not be followed by',
        lookbehind: 'lookbehind — must be preceded by',
        neglookbehind: 'negative lookbehind — must not be preceded by',
      }[node.kind];
      out.push({ label: kindLabel, detail: '', depth });
      explainAst(node.node, out, depth + 1);
      break;
    }
    case 'class':
      out.push({ label: 'character class', detail: node.raw, depth });
      break;
    case 'any':
      out.push({ label: 'any character', detail: 'except line break', depth });
      break;
    case 'anchor':
      out.push({
        label: node.kind === 'start' ? 'start anchor' : 'end anchor',
        detail: node.kind === 'start' ? 'matches start of line' : 'matches end of line',
        depth,
      });
      break;
    case 'escape':
      out.push({ label: `\\${node.char}`, detail: escapeLabel(node.char), depth });
      break;
    case 'literal':
      out.push({ label: 'literal', detail: `“${node.char}”`, depth });
      break;
    default:
      break;
  }
  return out;
}
