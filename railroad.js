// A compact railroad-diagram layout engine. Each node exposes
// { width, up, down, draw(x, y, cmds) } where (x, y) is the entry point on
// the main center line and (x + width, y) is the exit point. `up` / `down`
// describe how far the node's artwork extends above / below that line.

const CHAR_W = 7.2;
const PAD_X = 14;
const BOX_H = 26; // total terminal box height
const STUB = 16; // leader line length on each side of a terminal box
const ARC_GAP = 22; // vertical spacing used for skip / loop arcs

function textWidth(str) {
  return Math.max(str.length * CHAR_W, 10);
}

function arcPath(x1, y1, x2, y2) {
  const dx = (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}

export function Terminal(label, kind = 'literal') {
  const w = Math.max(textWidth(label) + PAD_X * 2, 46);
  const width = w + STUB * 2;
  return {
    width,
    up: BOX_H / 2,
    down: BOX_H / 2,
    draw(x, y, cmds) {
      const boxX = x + STUB;
      cmds.push({ t: 'line', x1: x, y1: y, x2: boxX, y2: y, kind });
      cmds.push({
        t: 'rect',
        x: boxX,
        y: y - BOX_H / 2,
        w,
        h: BOX_H,
        kind,
      });
      cmds.push({ t: 'text', x: boxX + w / 2, y: y + 4, label, kind });
      cmds.push({ t: 'line', x1: boxX + w, y1: y, x2: x + width, y2: y, kind });
    },
  };
}

export function Sequence(children) {
  if (children.length === 0) return Terminal('empty match', 'empty');
  const width = children.reduce((sum, c) => sum + c.width, 0);
  const up = Math.max(...children.map((c) => c.up));
  const down = Math.max(...children.map((c) => c.down));
  return {
    width,
    up,
    down,
    draw(x, y, cmds) {
      let cx = x;
      children.forEach((c) => {
        c.draw(cx, y, cmds);
        cx += c.width;
      });
    },
  };
}

export function Choice(branches) {
  const forkStub = 24;
  const innerWidth = Math.max(...branches.map((b) => b.width));
  const width = innerWidth + forkStub * 2;

  // First branch rides the main line; the rest stack below it.
  const gaps = ARC_GAP;
  let up = branches[0].up;
  let down = branches[0].down;
  const offsets = [0];
  let cursor = branches[0].down;
  for (let idx = 1; idx < branches.length; idx++) {
    const b = branches[idx];
    cursor += gaps + b.up;
    offsets.push(cursor);
    cursor += b.down;
  }
  down = cursor;

  return {
    width,
    up,
    down,
    draw(x, y, cmds) {
      const exitX = x + width;
      branches.forEach((b, idx) => {
        const branchY = y + offsets[idx];
        const startX = x + forkStub;
        const endX = exitX - forkStub;
        if (idx === 0) {
          cmds.push({ t: 'line', x1: x, y1: y, x2: startX, y2: y, kind: 'literal' });
        } else {
          cmds.push({ t: 'path', d: arcPath(x, y, startX, branchY), kind: 'literal' });
        }
        b.draw(startX, branchY, cmds);
        const bWidth = b.width;
        const bx = startX + bWidth;
        if (idx === 0) {
          cmds.push({ t: 'line', x1: bx, y1: branchY, x2: endX, y2: branchY, kind: 'literal' });
          cmds.push({ t: 'line', x1: endX, y1: branchY, x2: exitX, y2: y, kind: 'literal' });
        } else {
          cmds.push({ t: 'line', x1: bx, y1: branchY, x2: endX, y2: branchY, kind: 'literal' });
          cmds.push({ t: 'path', d: arcPath(endX, branchY, exitX, y), kind: 'literal' });
        }
      });
    },
  };
}

export function Repeat(child, min, max, symbol) {
  const hasSkip = min === 0;
  const hasLoop = max === Infinity || max > 1;
  const up = child.up + (hasSkip ? ARC_GAP : 0);
  const down = child.down + (hasLoop ? ARC_GAP : 0);
  let loopLabel = null;
  if (symbol && symbol !== '*' && symbol !== '+' && symbol !== '?') {
    loopLabel = symbol.replace('{', '×').replace('}', '');
  }

  return {
    width: child.width,
    up,
    down,
    draw(x, y, cmds) {
      child.draw(x, y, cmds);
      const exitX = x + child.width;
      if (hasSkip) {
        const skipY = y - up;
        cmds.push({ t: 'path', d: arcPath(x, y, x, skipY), kind: 'skip' });
        cmds.push({ t: 'line', x1: x, y1: skipY, x2: exitX, y2: skipY, kind: 'skip' });
        cmds.push({ t: 'path', d: arcPath(exitX, skipY, exitX, y), kind: 'skip' });
      }
      if (hasLoop) {
        const loopY = y + down;
        cmds.push({ t: 'path', d: arcPath(exitX, y, exitX, loopY), kind: 'loop' });
        cmds.push({ t: 'line', x1: exitX, y1: loopY, x2: x, y2: loopY, kind: 'loop', arrow: true });
        cmds.push({ t: 'path', d: arcPath(x, loopY, x, y), kind: 'loop' });
        if (loopLabel) {
          cmds.push({ t: 'text', x: (x + exitX) / 2, y: loopY + 4, label: loopLabel, kind: 'loop-label' });
        }
      }
    },
  };
}

export function Group(child, label) {
  const padX = 14;
  const padTop = 22;
  const padBottom = 10;
  return {
    width: child.width + padX * 2,
    up: child.up + padTop,
    down: child.down + padBottom,
    draw(x, y, cmds) {
      const boxX = x;
      const boxY = y - child.up - padTop + 12;
      const boxW = child.width + padX * 2;
      const boxH = child.up + child.down + padTop + padBottom - 12;
      cmds.push({ t: 'groupbox', x: boxX, y: boxY, w: boxW, h: boxH, label });
      child.draw(x + padX, y, cmds);
    },
  };
}

export function measure(root) {
  const width = root.width + 40;
  const height = root.up + root.down + 40;
  return { width, height, centerY: root.up + 20, startX: 20 };
}
