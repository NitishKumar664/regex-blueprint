# Regex Blueprint

Type a regular expression and watch it drafted live as a **railroad diagram**
(the notation used in formal-grammar syntax charts since the 1970s), styled
like an engineering blueprint. Test it against sample text alongside the
drawing, with matches highlighted, captured groups listed, and every token
explained in a plain-English parts list.

Everything runs client-side — a hand-written regex parser turns the pattern
into an AST, which a small layout engine converts into an SVG railroad
diagram. No backend, no external API calls.

## Features

- Live railroad diagram for groups, alternation `|`, quantifiers
  (`* + ? {n,m}`), character classes, anchors, and lookaround
- Live match testing against editable sample text, with highlighted hits
- Captured group inspector (numbered and named groups)
- Plain-English token breakdown ("parts list")
- A few starter presets (email, hex color, IPv4, 24h time)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

**Option A — Vercel CLI**

```bash
npm install -g vercel
vercel
```

Follow the prompts (link or create a project, accept the defaults — Vercel
auto-detects Next.js). Run `vercel --prod` to promote to production.

**Option B — GitHub import**

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Framework preset "Next.js" is auto-detected — no config needed.
4. Click Deploy.

No environment variables or extra configuration are required.

## Project structure

```
app/
  layout.js          root layout, fonts, metadata
  page.js             page shell / title block
  globals.css         blueprint theme
components/
  RegexPlayground.jsx  controls, matching, breakdown panel
  RailroadDiagram.jsx  SVG renderer for the diagram
lib/
  regexParser.js       regex string -> AST
  buildDiagram.js       AST -> railroad diagram node tree
  railroad.js           layout engine (Terminal/Sequence/Choice/Repeat/Group)
```

## Extending it

- The parser covers a practical subset of JS regex syntax. Unsupported
  constructs fall back to being treated as literal text rather than
  throwing, so the UI never breaks — see `lib/regexParser.js` if you want to
  add more (e.g. backreferences, unicode property escapes).
- The diagram engine (`lib/railroad.js`) is a small, self-contained
  reimplementation of the classic railroad-diagram layout algorithm — each
  node just needs `{ width, up, down, draw(x, y, cmds) }`.
