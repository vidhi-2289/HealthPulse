import React from 'react';

export default function Navigation({ navItems, activeTab, setActiveTab, loadData, seedDemoData, handleLogout }) {
  return (
    <nav className="nav">
      <div style={{ display: 'flex', gap: '0.5rem', flexGrow: 1 }}>
        {navItems.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setActiveTab(item)}
            className={activeTab === item ? "active" : ""}
          >
            {item}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={loadData}>Refresh</button>
        <button type="button" onClick={seedDemoData}>Seed Demo Data</button>
        <button type="button" onClick={handleLogout} className="danger">Logout</button>
      </div>
    </nav>
  );
}
