import React from 'react';

export default function LogsViewer({ checks, targets, checkFilters, setCheckFilters, applyCheckFilters, downloadReport }) {
  return (
    <section className="card">
      <h2>Health Check Logs (Latest 100)</h2>
      <div className="filter-row">
        <select
          value={checkFilters.targetId}
          onChange={(e) => setCheckFilters((f) => ({ ...f, targetId: e.target.value }))}
        >
          <option value="">All Targets</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.name}
            </option>
          ))}
        </select>
        <select
          value={checkFilters.status}
          onChange={(e) => setCheckFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Status</option>
          <option value="UP">UP</option>
          <option value="DOWN">DOWN</option>
        </select>
        <input
          type="datetime-local"
          value={checkFilters.from}
          onChange={(e) => setCheckFilters((f) => ({ ...f, from: e.target.value }))}
        />
        <input
          type="datetime-local"
          value={checkFilters.to}
          onChange={(e) => setCheckFilters((f) => ({ ...f, to: e.target.value }))}
        />
        <button className="primary" type="button" onClick={applyCheckFilters}>
          Apply Filters
        </button>
        <button type="button" onClick={() => downloadReport("checks", "csv")}>
          Export CSV
        </button>
        <button type="button" onClick={() => downloadReport("checks", "json")}>
          Export JSON
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Target</th>
              <th>Status</th>
              <th>Code</th>
              <th>Latency (ms)</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.id}>
                <td>{new Date(check.checkedAt).toLocaleString()}</td>
                <td>{check.target?.name || check.targetId}</td>
                <td>
                  <span className={`status-badge ${check.status === "UP" ? "up" : "down"}`}>{check.status}</span>
                </td>
                <td>{check.statusCode ?? "-"}</td>
                <td>{check.responseTimeMs ?? "-"}</td>
                <td style={{ color: 'var(--color-status-down)' }}>{check.errorMessage || "-"}</td>
              </tr>
            ))}
            {!checks.length && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No checks yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
