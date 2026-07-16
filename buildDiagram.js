import { Terminal, Sequence, Choice, Repeat, Group } from './railroad.js';
import { escapeLabel } from './regexParser.js';

function summarize(node) {
  // Short inline text used inside lookaround terminal boxes.
  if (node.type === 'seq') return node.nodes.map(summarize).join('');
  if (node.type === 'literal') return node.char;
  if (node.type === 'escape') return `\\${node.char}`;
  if (node.type === 'class') return node.raw;
  if (node.type === 'any') return '.';
  if (node.type === 'alt') return node.branches.map(summarize).join('|');
  if (node.type === 'group') return `(${summarize(node.node)})`;
  if (node.type === 'repeat') return `${summarize(node.node)}${node.symbol}`;
  return '';
}

export function buildDiagram(node) {
  switch (node.type) {
    case 'seq': {
      const parts = [];
      let buffer = '';
      node.nodes.forEach((child) => {
        if (child.type === 'literal') {
          buffer += child.char;
        } else {
          if (buffer) {
            parts.push(Terminal(buffer, 'literal'));
            buffer = '';
          }
          parts.push(buildDiagram(child));
        }
      });
      if (buffer) parts.push(Terminal(buffer, 'literal'));
      if (parts.length === 0) return Terminal('empty', 'empty');
      if (parts.length === 1) return parts[0];
      return Sequence(parts);
    }
    case 'alt':
      return Choice(node.branches.map(buildDiagram));
    case 'repeat':
      return Repeat(buildDiagram(node.node), node.min, node.max, node.symbol);
    case 'group': {
      if (node.kind === 'noncap') return buildDiagram(node.node);
      if (node.kind === 'capture') {
        return Group(buildDiagram(node.node), node.name ? `“${node.name}”` : 'capture');
      }
      const prefixes = {
        lookahead: 'followed by',
        neglookahead: 'not followed by',
        lookbehind: 'preceded by',
        neglookbehind: 'not preceded by',
      };
      return Terminal(`${prefixes[node.kind]}: ${summarize(node.node)}`, 'lookaround');
    }
    case 'class':
      return Terminal(node.raw, 'class');
    case 'any':
      return Terminal('any character', 'any');
    case 'anchor':
      return Terminal(node.kind === 'start' ? 'start of line' : 'end of line', 'anchor');
    case 'escape':
      return Terminal(`\\${node.char} — ${escapeLabel(node.char)}`, 'escape');
    case 'literal':
      return Terminal(node.char, 'literal');
    default:
      return Terminal('?', 'literal');
  }
}
