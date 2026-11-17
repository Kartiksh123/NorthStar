import { useCallback, useEffect, useState } from 'react';
import { api } from './services/api.js';
import AuthPage from './components/AuthPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import OverviewPage from './components/OverviewPage.jsx';
import DatasetsPage from './components/DatasetsPage.jsx';
import ConnectionsPage from './components/ConnectionsPage.jsx';
import QueryPage from './components/QueryPage.jsx';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';

const pageTitles = {
  overview: 'Overview',
  datasets: 'Your datasets',
  connections: 'Connections',
  query: 'AI query studio',
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('northstar_token'));
  const [user, setUser] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activePage, setActivePage] = useState('overview');
  const [querySource, setQuerySource] = useState({ type: 'datasets', ids: [] });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [notice, setNotice] = useState(null);

  const showNotice = useCallback((message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadWorkspace = useCallback(async () => {
    const [datasetResult, connectionResult] = await Promise.allSettled([
      api.listDatasets(),
      api.listConnections(),
    ]);
    if (datasetResult.status === 'fulfilled') setDatasets(datasetResult.value.datasets || []);
    if (connectionResult.status === 'fulfilled') setConnections(connectionResult.value.connections || []);
    setIsBackendOnline(datasetResult.status === 'fulfilled' || connectionResult.status === 'fulfilled');
    if (datasetResult.status === 'rejected' && connectionResult.status === 'rejected') {
      showNotice('Could not reach the backend. Make sure it is running on port 3000.', 'error');
    }
  }, [showNotice]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    Promise.all([api.me(), loadWorkspace()])
      .then(([result]) => {
        if (isMounted) setUser(result.user);
      })
      .catch(() => {
        localStorage.removeItem('northstar_token');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [token, loadWorkspace]);

  async function handleAuthenticated(result) {
    localStorage.setItem('northstar_token', result.token);
    setToken(result.token);
    setUser(result.user);
    setIsBackendOnline(true);
    setActivePage('overview');
    await loadWorkspace();
  }

  function handleLogout() {
    localStorage.removeItem('northstar_token');
    setToken(null);
    setUser(null);
    setIsBackendOnline(false);
    setDatasets([]);
    setConnections([]);
  }

  function openQuery(source) {
    setQuerySource(source);
    setActivePage('query');
  }

  if (isLoading) {
    return <div className="loading-screen"><LoaderCircle className="spin" size={24} /> Connecting to your workspace…</div>;
  }

  if (!token || !user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  let pageContent;
  if (activePage === 'datasets') {
    pageContent = (
      <DatasetsPage
        datasets={datasets}
        onRefresh={loadWorkspace}
        onNotify={showNotice}
        onAsk={(id) => openQuery({ type: 'datasets', ids: [id] })}
      />
    );
  } else if (activePage === 'connections') {
    pageContent = (
      <ConnectionsPage
        connections={connections}
        onRefresh={loadWorkspace}
        onNotify={showNotice}
        onAsk={(id) => openQuery({ type: 'connection', id })}
      />
    );
  } else if (activePage === 'query') {
    pageContent = (
      <QueryPage
        datasets={datasets}
        connections={connections}
        initialSource={querySource}
        onNotify={showNotice}
      />
    );
  } else {
    pageContent = (
      <OverviewPage
        user={user}
        datasets={datasets}
        connections={connections}
        onNavigate={setActivePage}
        onAsk={() => openQuery({ type: 'datasets', ids: [] })}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} user={user} onLogout={handleLogout} />
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{pageTitles[activePage]}</strong></div>
          <div className="topbar-right">
            <span className={`connection-status ${isBackendOnline ? '' : 'connection-status-offline'}`}><span className="status-dot" /> {isBackendOnline ? 'Backend connected' : 'Backend unavailable'}</span>
            <div className="topbar-avatar">{user.name?.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="page-content">{pageContent}</div>
      </main>
      {notice && (
        <div className={`toast ${notice.type === 'error' ? 'toast-error' : ''}`} role="status">
          {notice.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {notice.message}
        </div>
      )}
    </div>
  );
}
