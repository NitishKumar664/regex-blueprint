import RegexPlayground from '@/components/RegexPlayground';

export default function Home() {
  return (
    <main className="page">
      <header className="titleblock">
        <p className="tb-eyebrow">Drafting sheet · No. 001</p>
        <h1 className="tb-title">Regex Blueprint</h1>
        <p className="tb-desc">
          Draft a regular expression and watch it laid out as a railroad diagram — the same
          notation engineers have used to draft formal grammars since the 1970s. Test it live
          against sample text alongside the drawing.
        </p>
        <div className="tb-fields">
          <div>
            <span className="tb-field-label">Notation</span>
            <span className="tb-field-value">Railroad / syntax diagram</span>
          </div>
          <div>
            <span className="tb-field-label">Engine</span>
            <span className="tb-field-value">JavaScript RegExp</span>
          </div>
          <div>
            <span className="tb-field-label">Scale</span>
            <span className="tb-field-value">1:1, auto-fit</span>
          </div>
          <div>
            <span className="tb-field-label">Rev.</span>
            <span className="tb-field-value">A</span>
          </div>
        </div>
      </header>

      <RegexPlayground />

      <footer className="page-footer">
        <span>Parses a practical subset of JS regex: groups, classes, quantifiers, alternation, anchors, lookaround.</span>
        <span>Built with Next.js — deployed on Vercel.</span>
      </footer>
    </main>
  );
}
