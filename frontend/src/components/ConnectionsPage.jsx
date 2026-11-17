import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Database,
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';

const emptyForm = {
  name: '',
  host: '',
  port: '5432',
  database: '',
  username: '',
  password: '',
  ssl: false,
};

export default function ConnectionsPage({ connections, onRefresh, onNotify, onAsk }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeSchemaId, setActiveSchemaId] = useState('');
  const [schemas, setSchemas] = useState({});
  const [loadingSchemaId, setLoadingSchemaId] = useState('');

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function saveConnection(event) {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      await api.createConnection({ ...form, port: Number(form.port) });
      setForm(emptyForm);
      setShowForm(false);
      await onRefresh();
      onNotify('Database connected. Your credentials are encrypted at rest.');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleSchema(connection) {
    if (activeSchemaId === connection.id) {
      setActiveSchemaId('');
      return;
    }
    setActiveSchemaId(connection.id);
    if (schemas[connection.id]) return;

    setLoadingSchemaId(connection.id);
    try {
      const schema = await api.getConnectionSchema(connection.id);
      setSchemas((current) => ({ ...current, [connection.id]: schema }));
    } catch (error) {
      onNotify(error.message, 'error');
      setActiveSchemaId('');
    } finally {
      setLoadingSchemaId('');
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div><span className="eyebrow"><span className="eyebrow-sparkle"><Database size={13} /></span> BRING YOUR DATA TOGETHER</span><h1>Connections<span className="heading-period">.</span></h1><p className="page-subtitle">Securely connect a PostgreSQL database you already use.</p></div>
        <button className="button button-primary" onClick={() => setShowForm(!showForm)}>{showForm ? <X size={17} /> : <Plus size={17} />}{showForm ? 'Close form' : 'Add connection'}</button>
      </section>

      <section className="connection-info-banner">
        <span className="connection-banner-icon"><ShieldCheck size={19} /></span>
        <div><strong>Your credentials stay yours.</strong><p>Passwords are encrypted before they’re stored and never shown again.</p></div>
        <span className="secure-label"><span className="status-dot" /> ENCRYPTED</span>
      </section>

      {showForm && (
        <form className="connection-form panel" onSubmit={saveConnection}>
          <div className="form-panel-heading"><div><span className="panel-kicker">NEW SOURCE</span><h2>Connect PostgreSQL</h2></div><span className="form-panel-number">01</span></div>
          <div className="connection-fields">
            <label className="field-label">Connection name<input name="name" placeholder="Production database" value={form.name} onChange={updateField} required maxLength={100} /></label>
            <label className="field-label">Host<input name="host" placeholder="db.company.com" value={form.host} onChange={updateField} required /></label>
            <label className="field-label">Port<input name="port" type="number" min="1" max="65535" placeholder="5432" value={form.port} onChange={updateField} required /></label>
            <label className="field-label">Database<input name="database" placeholder="analytics" value={form.database} onChange={updateField} required /></label>
            <label className="field-label">Username<input name="username" placeholder="postgres" value={form.username} onChange={updateField} required /></label>
            <label className="field-label">Password<span className="password-inline"><KeyRound size={15} /><input name="password" type="password" placeholder="Your database password" value={form.password} onChange={updateField} required /></span></label>
          </div>
          <label className="checkbox-row"><input type="checkbox" name="ssl" checked={form.ssl} onChange={updateField} /><span className="checkbox-custom"><Check size={12} /></span><span>Require SSL encryption</span><small>Recommended for remote databases</small></label>
          {formError && <div className="inline-error">{formError}</div>}
          <div className="form-panel-footer"><span><ShieldCheck size={15} /> We’ll verify the connection before saving it.</span><button className="button button-primary" disabled={isSaving}>{isSaving ? <LoaderCircle className="spin" size={16} /> : <Database size={16} />}{isSaving ? 'Testing connection…' : 'Test & connect'}<ArrowUpRight size={15} /></button></div>
        </form>
      )}

      <section className="connections-section">
        <div className="section-heading-row"><div><span className="panel-kicker">YOUR DATABASES</span><h2>Connected sources <span className="title-count">{connections.length}</span></h2></div><span className="dataset-sort"><span>PostgreSQL</span><ChevronDown size={14} /></span></div>
        {connections.length ? (
          <div className="connection-list">
            {connections.map((connection) => {
              const schema = schemas[connection.id];
              return (
                <article className={`connection-card ${activeSchemaId === connection.id ? 'connection-card-open' : ''}`} key={connection.id}>
                  <div className="connection-card-main">
                    <span className="connection-db-icon"><Database size={20} /></span>
                    <div className="connection-db-info"><h3>{connection.name}</h3><span>{connection.host}:{connection.port} <i /> {connection.database_name}</span></div>
                    <span className="connection-live-badge"><span className="status-dot" /> SAVED</span>
                    <button className="connection-schema-button" onClick={() => toggleSchema(connection)}>{activeSchemaId === connection.id ? 'Hide schema' : 'Inspect schema'}{loadingSchemaId === connection.id ? <LoaderCircle className="spin" size={15} /> : <ChevronDown className={activeSchemaId === connection.id ? 'rotate-icon' : ''} size={15} />}</button>
                    <button className="button button-outline connection-ask-button" onClick={() => onAsk(connection.id)}><Sparkles size={14} /> Ask <ArrowRight size={14} /></button>
                  </div>
                  {activeSchemaId === connection.id && (
                    <div className="connection-schema-panel">
                      {schema ? (
                        <>
                          <div className="schema-summary"><span><Table2 size={15} /> {schema.tables.length} tables & views</span><span><Link2Icon /> {schema.relationships.length} foreign-key relationships</span></div>
                          {schema.tables.length ? <div className="schema-table-list">{schema.tables.map((table) => <div className="schema-table-row" key={`${table.schema}.${table.name}`}><div><Table2 size={15} /><strong>{table.schema}.{table.name}</strong><small>{table.type}</small></div><span>{table.columns.length} columns</span></div>)}</div> : <div className="schema-empty"><Search size={16} /> No visible tables found in this database.</div>}
                        </>
                      ) : <div className="preview-loading"><LoaderCircle className="spin" size={17} /> Reading database schema…</div>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state-panel connection-empty">
            <span className="empty-state-icon"><Database size={23} /></span><h3>Your first connection is one form away</h3><p>Connect a PostgreSQL database to inspect its schema and ask questions across existing tables.</p><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Connect a database</button>
          </div>
        )}
      </section>
    </div>
  );
}

function Link2Icon() {
  return <span className="schema-link-symbol">↗</span>;
}
