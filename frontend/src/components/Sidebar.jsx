import {
  ArrowUpRight,
  Database,
  HardDrive,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Plus,
} from 'lucide-react';

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'datasets', label: 'Datasets', icon: HardDrive },
  { id: 'connections', label: 'Connections', icon: Database },
  { id: 'query', label: 'AI query studio', icon: MessageSquareText },
];

export default function Sidebar({ activePage, onNavigate, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup brand-lockup-light sidebar-brand"><span className="brand-mark"><Database size={18} strokeWidth={2.4} /></span><span>northstar<span className="brand-period">.</span></span></div>

      <div className="workspace-switcher">
        <span className="workspace-icon">{user.name?.slice(0, 1).toUpperCase()}</span>
        <span className="workspace-label"><strong>{user.name?.split(' ')[0]}'s workspace</strong><small>Personal workspace</small></span>
        <span className="switcher-dots">···</span>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-label={label} title={label} className={`nav-item ${activePage === id ? 'nav-item-active' : ''}`} onClick={() => onNavigate(id)}>
            <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
            {id === 'query' && <span className="nav-new-dot" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-quick-card">
        <span className="quick-card-icon"><Plus size={16} /></span>
        <div><strong>Bring in your data</strong><span>Connect a source to begin.</span></div>
        <button aria-label="Go to connections" onClick={() => onNavigate('connections')}><ArrowUpRight size={15} /></button>
      </div>
      <div className="sidebar-footnote"><span className="status-dot" /> PRIVATE WORKSPACE</div>
      <div className="sidebar-profile">
        <span className="profile-avatar">{user.name?.slice(0, 1).toUpperCase()}</span>
        <span className="profile-info"><strong>{user.name}</strong><small>{user.email}</small></span>
        <button className="icon-button logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
      </div>
    </aside>
  );
}
