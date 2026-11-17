import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  CircleHelp,
  Database,
  FileSpreadsheet,
  Link2,
  MessageSquareText,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value) {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

export default function OverviewPage({ user, datasets, connections, onNavigate, onAsk }) {
  const rowTotal = datasets.reduce((total, dataset) => total + Number(dataset.row_count || 0), 0);
  const recentDatasets = datasets.slice(0, 4);
  const firstName = user.name?.split(' ')[0] || 'there';

  return (
    <div className="page-stack overview-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-sparkle"><Sparkles size={13} /></span> YOUR DATA, IN FOCUS</div>
          <h1>Good morning, {firstName}<span className="heading-period">.</span></h1>
          <p className="page-subtitle">Here’s what’s happening across your workspace.</p>
        </div>
        <div className="welcome-date"><span className="date-dot" /> WORKSPACE OVERVIEW</div>
      </section>

      <section className="hero-card">
        <div className="hero-card-content">
          <span className="hero-chip"><Sparkles size={13} /> A clearer way to work with data</span>
          <h2>Ask the question.<br /><em>Find the answer.</em></h2>
          <p>Skip the query syntax. Ask about your data in plain English and let Northstar do the heavy lifting.</p>
          <button className="button button-lime" onClick={onAsk}>Open AI query studio <ArrowUpRight size={16} /></button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual-grid" />
          <div className="orbit orbit-large" /><div className="orbit orbit-medium" /><div className="orbit orbit-small" />
          <div className="visual-center"><Sparkles size={21} /></div>
          <div className="visual-node node-one"><Database size={16} /></div>
          <div className="visual-node node-two"><Braces size={16} /></div>
          <div className="visual-node node-three"><MessageSquareText size={16} /></div>
          <div className="visual-caption"><span className="visual-caption-dot" /> YOUR DATA, CONNECTED</div>
        </div>
        <div className="hero-index">01 <span>/</span> 03</div>
      </section>

      <section className="stats-grid" aria-label="Workspace statistics">
        <article className="stat-card">
          <span className="stat-icon stat-icon-violet"><FileSpreadsheet size={18} /></span>
          <span className="stat-label">DATASETS</span>
          <strong className="stat-number">{formatNumber(datasets.length)}</strong>
          <span className="stat-footnote">Uploaded and ready to explore</span>
          <ArrowUpRight className="stat-corner" size={15} />
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon-mint"><Database size={18} /></span>
          <span className="stat-label">CONNECTED SOURCES</span>
          <strong className="stat-number">{formatNumber(connections.length)}</strong>
          <span className="stat-footnote">PostgreSQL databases</span>
          <ArrowUpRight className="stat-corner" size={15} />
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon-amber"><Braces size={18} /></span>
          <span className="stat-label">ROWS AVAILABLE</span>
          <strong className="stat-number">{formatNumber(rowTotal)}</strong>
          <span className="stat-footnote">Across your uploaded datasets</span>
          <ArrowDownRight className="stat-corner stat-corner-down" size={15} />
        </article>
      </section>

      <section className="overview-lower-grid">
        <div className="panel recent-panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">YOUR WORKSPACE</span><h3>Recently added</h3></div>
            <button className="text-button" onClick={() => onNavigate('datasets')}>View all <ArrowRight size={15} /></button>
          </div>
          {recentDatasets.length ? (
            <div className="recent-list">
              {recentDatasets.map((dataset, index) => (
                <div className="recent-row" key={dataset.id}>
                  <span className={`recent-file-icon file-tone-${index % 3}`}><FileSpreadsheet size={18} /></span>
                  <span className="recent-file-info"><strong>{dataset.name}</strong><small>{formatNumber(dataset.row_count)} rows <span>·</span> {dataset.columns?.length || 0} columns</small></span>
                  <span className="recent-date">{formatDate(dataset.created_at)}</span>
                  <Check className="recent-check" size={16} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-list"><span className="empty-list-icon"><Upload size={18} /></span><span><strong>Your first dataset starts here</strong><small>Upload a spreadsheet or connect PostgreSQL.</small></span></div>
          )}
        </div>

        <div className="panel quickstart-panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">A GOOD PLACE TO START</span><h3>Make it yours</h3></div>
            <CircleHelp size={17} className="muted-icon" />
          </div>
          <button className="quickstart-row" onClick={() => onNavigate('datasets')}>
            <span className={`quickstep ${datasets.length ? 'quickstep-done' : ''}`}>{datasets.length ? <Check size={15} /> : '01'}</span>
            <span><strong>Upload a dataset</strong><small>CSV, Excel, or JSON</small></span>
            <ArrowRight size={15} />
          </button>
          <button className="quickstart-row" onClick={() => onNavigate('connections')}>
            <span className={`quickstep ${connections.length ? 'quickstep-done' : ''}`}>{connections.length ? <Check size={15} /> : '02'}</span>
            <span><strong>Connect PostgreSQL</strong><small>Bring your own database</small></span>
            <ArrowRight size={15} />
          </button>
          <button className="quickstart-row" onClick={onAsk}>
            <span className="quickstep">03</span>
            <span><strong>Ask your data a question</strong><small>Answers in plain English</small></span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="bottom-nudge">
        <span className="bottom-nudge-icon"><Link2 size={16} /></span>
        <p><strong>One workspace. More ways to see the story.</strong> Connect a database or bring in a file to get started.</p>
        <button className="text-button" onClick={() => onNavigate('connections')}>Add a source <Plus size={15} /></button>
      </section>
    </div>
  );
}
