import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  Braces,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  FileSpreadsheet,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import DataTable from './DataTable.jsx';

const suggestions = [
  'Show me a quick summary',
  'What are the top 5 by value?',
  'Find any missing information',
];

export default function QueryPage({ datasets, connections, initialSource, onNotify }) {
  const [sourceType, setSourceType] = useState(initialSource?.type === 'connection' ? 'connection' : 'datasets');
  const [selectedDatasetIds, setSelectedDatasetIds] = useState(initialSource?.ids || []);
  const [connectionId, setConnectionId] = useState(initialSource?.id || '');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    if (!connectionId && connections.length) setConnectionId(connections[0].id);
  }, [connections, connectionId]);

  function toggleDataset(id) {
    setSelectedDatasetIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function askQuestion(event) {
    event.preventDefault();
    if (!question.trim()) return;

    setError('');
    setResult(null);
    setIsAsking(true);
    const request = sourceType === 'connection'
      ? { connectionId, question: question.trim() }
      : { datasetIds: selectedDatasetIds, question: question.trim() };

    try {
      const response = await api.askQuestion(request);
      setResult(response);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.message.includes('GEMINI_API_KEY')) {
        onNotify('Add a Gemini API key in the backend .env to enable AI questions.', 'error');
      }
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="page-stack query-page">
      <section className="page-heading-row query-heading-row">
        <div><span className="eyebrow"><span className="eyebrow-sparkle"><Sparkles size={13} /></span> YOUR DATA, ANSWERED</span><h1>Ask anything<span className="heading-period">.</span></h1><p className="page-subtitle">A natural-language question in. A clear answer out.</p></div>
        <div className="query-model-pill"><span className="model-pulse" /><span>AI QUERY ENGINE</span><WandSparkles size={15} /></div>
      </section>

      <section className="query-workspace">
        <div className="query-builder panel">
          <div className="query-builder-heading"><span className="query-step-number">01</span><div><span className="panel-kicker">CHOOSE YOUR SOURCE</span><h2>What should we look at?</h2></div><CircleHelp size={16} className="muted-icon" /></div>

          <div className="source-tabs" role="tablist" aria-label="Data source type">
            <button className={sourceType === 'datasets' ? 'source-tab-active' : ''} onClick={() => setSourceType('datasets')} role="tab" aria-selected={sourceType === 'datasets'}><FileSpreadsheet size={16} /> Uploaded datasets <span>{datasets.length}</span></button>
            <button className={sourceType === 'connection' ? 'source-tab-active' : ''} onClick={() => setSourceType('connection')} role="tab" aria-selected={sourceType === 'connection'}><Database size={16} /> PostgreSQL <span>{connections.length}</span></button>
          </div>

          {sourceType === 'datasets' ? (
            datasets.length ? (
              <div className="source-picker-list">
                {datasets.map((dataset) => {
                  const selected = selectedDatasetIds.includes(dataset.id);
                  return (
                    <button className={`source-picker-row ${selected ? 'source-picker-selected' : ''}`} key={dataset.id} onClick={() => toggleDataset(dataset.id)}>
                      <span className={`source-file-icon ${selected ? 'source-file-selected' : ''}`}><FileSpreadsheet size={17} /></span>
                      <span className="source-picker-info"><strong>{dataset.name}</strong><small>{Number(dataset.row_count).toLocaleString()} rows · {dataset.columns?.length || 0} columns</small></span>
                      <span className={`source-checkbox ${selected ? 'source-checkbox-checked' : ''}`}>{selected && <Check size={13} />}</span>
                    </button>
                  );
                })}
                <div className="source-helper"><Sparkles size={14} /> Select more than one dataset to explore possible relationships.</div>
              </div>
            ) : (
              <div className="source-empty"><FileSpreadsheet size={19} /><span><strong>No datasets yet</strong><small>Upload a CSV, Excel, or JSON file first.</small></span></div>
            )
          ) : connections.length ? (
            <label className="field-label source-connection-label">Connected database
              <span className="select-wrap"><select value={connectionId} onChange={(event) => setConnectionId(event.target.value)}>{connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name} · {connection.database_name}</option>)}</select><ChevronDown size={15} /></span>
            </label>
          ) : (
            <div className="source-empty"><Database size={19} /><span><strong>No databases connected</strong><small>Add a PostgreSQL connection first.</small></span></div>
          )}

          <form className="question-form" onSubmit={askQuestion}>
            <div className="query-builder-heading query-question-heading"><span className="query-step-number">02</span><div><span className="panel-kicker">ASK IN PLAIN ENGLISH</span><h2>What do you want to know?</h2></div></div>
            <div className="question-box">
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. Which products had the highest sales last month?" maxLength={1000} rows={4} />
              <div className="question-box-footer"><span><MessageSquareText size={14} /> Your question becomes a safe, read-only query.</span><span>{question.length}/1000</span></div>
            </div>
            <div className="suggestion-pills">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div>
            {error && <div className="query-error"><CircleHelp size={16} /><span>{error}</span></div>}
            <div className="query-submit-row"><span><Braces size={15} /> SQL is validated before it runs.</span><button className="button button-dark" disabled={isAsking || !question.trim() || (sourceType === 'datasets' ? !selectedDatasetIds.length : !connectionId)}>{isAsking ? <><LoaderCircle className="spin" size={16} /> Thinking…</> : <><Sparkles size={15} /> Generate answer <ArrowUpRight size={15} /></>}</button></div>
          </form>
        </div>

        <aside className="query-aside">
          <div className="query-aside-card query-aside-violet">
            <span className="aside-orbit"><Sparkles size={17} /></span><span className="panel-kicker">A LITTLE MAGIC, A LOT OF GUARDRAILS</span><h3>Understandable answers.<br /><em>Responsible queries.</em></h3><p>Questions become read-only SQL, limited to the data source you selected.</p>
            <div className="aside-check"><Check size={14} /> Read-only execution</div><div className="aside-check"><Check size={14} /> Schema-aware generation</div><div className="aside-check"><Check size={14} /> Results capped for safety</div>
          </div>
          <div className="query-aside-card query-aside-tip"><span className="tip-icon"><ArrowDown size={16} /></span><div><span className="panel-kicker">TIP FOR BETTER ANSWERS</span><p>Be specific about dates, categories, or what you want to compare.</p></div></div>
        </aside>
      </section>

      {isAsking && <div className="query-thinking"><span className="thinking-icon"><Sparkles size={17} /></span><div><strong>Working through your question</strong><span>Checking the schema, writing a safe query, and collecting the result.</span></div><LoaderCircle className="spin" size={18} /></div>}

      {result && (
        <section className="query-result panel">
          <div className="result-heading">
            <div className="result-heading-icon"><Sparkles size={18} /></div>
            <div><span className="panel-kicker">HERE’S WHAT WE FOUND</span><h2>Your answer</h2></div>
            <span className="result-count">{Number(result.rowCount).toLocaleString()} {result.rowCount === 1 ? 'row' : 'rows'}</span>
          </div>
          <div className="answer-summary"><span className="answer-quote-mark">“</span><p>{result.explanation}</p></div>
          <div className="result-table-heading"><div><span className="panel-kicker">QUERY RESULTS</span><span className="result-table-caption">Showing up to 500 rows</span></div><button className="text-button" onClick={() => setShowSql(!showSql)}>{showSql ? 'Hide SQL' : 'View SQL'} <ChevronDown className={showSql ? 'rotate-icon' : ''} size={15} /></button></div>
          {showSql && <pre className="sql-preview"><code>{result.sql}</code></pre>}
          <DataTable rows={result.rows} />
          <div className="result-footer"><span><Check size={14} /> Query validated and completed in read-only mode.</span><button className="button button-outline" onClick={() => { setQuestion(''); setResult(null); setError(''); }}><RotateCcw size={14} /> Ask another</button></div>
        </section>
      )}
    </div>
  );
}
