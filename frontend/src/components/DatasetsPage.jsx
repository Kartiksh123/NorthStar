import { useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CloudUpload,
  Database,
  FileJson2,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';
import DataTable from './DataTable.jsx';

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Recently added';
}

function FileTypeIcon({ name }) {
  const extension = name?.split('.').pop()?.toLowerCase();
  if (extension === 'json') return <FileJson2 size={20} />;
  if (extension === 'csv') return <FileText size={20} />;
  return <FileSpreadsheet size={20} />;
}

export default function DatasetsPage({ datasets, onRefresh, onNotify, onAsk }) {
  const fileInput = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeDataset, setActiveDataset] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  async function uploadFile(file) {
    if (!file) return;
    setUploadError('');
    setIsUploading(true);
    try {
      const result = await api.uploadDataset(file);
      await onRefresh();
      onNotify(`${result.dataset.name} is ready to explore.`);
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function openPreview(dataset) {
    setActiveDataset(dataset);
    setIsLoadingPreview(true);
    try {
      const [details, preview] = await Promise.all([
        api.getDataset(dataset.id),
        api.previewDataset(dataset.id),
      ]);
      setActiveDataset(details.dataset);
      setPreviewRows(preview.rows || []);
    } catch (error) {
      onNotify(error.message, 'error');
      setActiveDataset(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    uploadFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div><span className="eyebrow"><span className="eyebrow-sparkle"><FileSpreadsheet size={13} /></span> YOUR DATA, ORGANIZED</span><h1>Datasets<span className="heading-period">.</span></h1><p className="page-subtitle">Bring your files in. We’ll take care of the structure.</p></div>
        <div className="heading-count"><span className="count-number">{datasets.length.toString().padStart(2, '0')}</span><span>DATASETS</span></div>
      </section>

      <section
        className={`upload-zone ${isDragging ? 'upload-zone-dragging' : ''} ${isUploading ? 'upload-zone-busy' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".csv,.xlsx,.json"
          onChange={(event) => uploadFile(event.target.files[0])}
        />
        <span className="upload-icon-wrap">{isUploading ? <LoaderCircle className="spin" size={22} /> : <CloudUpload size={22} />}</span>
        <div className="upload-zone-copy">
          <strong>{isUploading ? 'Reading your file…' : 'Drop your data file here'}</strong>
          <span>CSV, XLSX, or JSON <i /> Up to 10 MB</span>
        </div>
        <button className="button button-outline" disabled={isUploading} onClick={() => fileInput.current?.click()}>
          <Plus size={16} /> Browse files
        </button>
        <span className="upload-zone-foot"><Sparkles size={13} /> Columns and data types are detected automatically</span>
      </section>
      {uploadError && <div className="inline-error">{uploadError}</div>}

      <section className="dataset-section">
        <div className="section-heading-row">
          <div><span className="panel-kicker">READY WHEN YOU ARE</span><h2>Your data library <span className="title-count">{datasets.length}</span></h2></div>
          <div className="dataset-sort"><span>Sorted by</span><strong>Recently added</strong><ChevronDown size={14} /></div>
        </div>

        {datasets.length ? (
          <div className="dataset-grid">
            {datasets.map((dataset, index) => (
              <article className="dataset-card" key={dataset.id}>
                <div className="dataset-card-top">
                  <span className={`dataset-file-icon dataset-tone-${index % 3}`}><FileTypeIcon name={dataset.name} /></span>
                  <button className="icon-button dataset-more" onClick={() => openPreview(dataset)} title="Preview dataset"><ArrowUpRight size={17} /></button>
                </div>
                <div className="dataset-card-title"><h3>{dataset.name}</h3><span className="dataset-ready-dot" title="Ready" /></div>
                <span className="dataset-added">Added {formatDate(dataset.created_at)}</span>
                <div className="dataset-metrics">
                  <div><strong>{formatNumber(dataset.row_count)}</strong><span>ROWS</span></div>
                  <div><strong>{dataset.columns?.length || 0}</strong><span>COLUMNS</span></div>
                  <div><strong>{dataset.relationships?.length || 0}</strong><span>LINKS</span></div>
                </div>
                <div className="dataset-card-footer">
                  <button className="dataset-action dataset-preview-action" onClick={() => openPreview(dataset)}><ArrowDownToLine size={15} /> Preview</button>
                  <button className="dataset-action dataset-ask-action" onClick={() => onAsk(dataset.id)}><Sparkles size={14} /> Ask this data <ArrowRight size={14} /></button>
                </div>
              </article>
            ))}
            <button className="dataset-add-card" onClick={() => fileInput.current?.click()}>
              <span className="add-card-icon"><Plus size={19} /></span><strong>Add another dataset</strong><span>Drop in another file whenever you’re ready.</span>
            </button>
          </div>
        ) : (
          <div className="empty-state-panel">
            <span className="empty-state-icon"><FileSpreadsheet size={23} /></span>
            <h3>Your data library is waiting</h3>
            <p>Upload a CSV, Excel, or JSON file to see its structure, preview rows, and ask questions.</p>
            <button className="button button-primary" onClick={() => fileInput.current?.click()}><Plus size={16} /> Add your first dataset</button>
          </div>
        )}
      </section>

      {activeDataset && (
        <div className="modal-backdrop" role="presentation" onClick={() => setActiveDataset(null)}>
          <section className="dataset-modal" role="dialog" aria-modal="true" aria-label={`${activeDataset.name} preview`} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div><span className="panel-kicker">DATASET INSPECTOR</span><h2>{activeDataset.name}</h2><span className="modal-subtitle">{formatNumber(activeDataset.row_count)} rows · {activeDataset.columns?.length || 0} columns</span></div>
              <button className="icon-button modal-close" onClick={() => setActiveDataset(null)} aria-label="Close preview"><X size={19} /></button>
            </div>
            <div className="schema-chip-list">
              {(activeDataset.columns || []).map((column) => <span className="schema-chip" key={column.name}><strong>{column.name}</strong><i>{column.dataType}</i></span>)}
            </div>
            {activeDataset.relationships?.length > 0 && <div className="relationship-note"><Check size={15} /> {activeDataset.relationships.length} possible relationship{activeDataset.relationships.length === 1 ? '' : 's'} found by column naming.</div>}
            <div className="preview-heading"><span>ROW PREVIEW</span><small>First 100 rows</small></div>
            {isLoadingPreview ? <div className="preview-loading"><LoaderCircle className="spin" size={18} /> Loading preview…</div> : <DataTable rows={previewRows} columns={activeDataset.columns} />}
            <div className="modal-footer"><button className="button button-outline" onClick={() => setActiveDataset(null)}>Close</button><button className="button button-primary" onClick={() => { setActiveDataset(null); onAsk(activeDataset.id); }}><Sparkles size={15} /> Ask about this data</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
