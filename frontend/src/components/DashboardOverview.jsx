import React from 'react';

export default function DashboardOverview({ summary }) {
  return (
    <section className="cards">
      <article className="card">
        <h2>Overview</h2>
        <ul>
          <li>Total targets: <strong>{summary?.totalTargets ?? 0}</strong></li>
          <li>Active targets: <strong>{summary?.activeTargets ?? 0}</strong></li>
          <li>Total checks: <strong>{summary?.totalChecks ?? 0}</strong></li>
          <li>Uptime: <strong>{summary?.uptimePercent ?? 0}%</strong></li>
        </ul>
      </article>
      <article className="card">
        <h2>Monitor Endpoints</h2>
        <ul>
          <li>Backend API: http://localhost:4000/api/health</li>
          <li>Demo app: http://demo-target-app:5001/health</li>
          <li>Scheduler: every 60 seconds</li>
        </ul>
      </article>
      <article className="card">
        <h2>Latest Status by Target</h2>
        {summary?.latestChecksByTarget?.length ? (
          <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
            {summary.latestChecksByTarget.map((row) => (
              <li key={row.targetId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--color-neutral)', paddingBottom: '0.25rem' }}>
                <span>{row.targetName}</span>
                <span className={`status-badge ${row.latestStatus === "UP" ? "up" : "down"}`}>
                  {row.latestStatus}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No targets yet.</p>
        )}
      </article>
    </section>
  );
}
