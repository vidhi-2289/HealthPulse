import React from 'react';

export default function AlertsViewer({ alerts, targets, alertFilters, setAlertFilters, applyAlertFilters, downloadReport }) {
  return (
    <section className="card">
      <h2>Alerts (Latest 100)</h2>
      <div className="filter-row">
        <select
          value={alertFilters.targetId}
          onChange={(e) => setAlertFilters((f) => ({ ...f, targetId: e.target.value }))}
        >
          <option value="">All Targets</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.name}
            </option>
          ))}
        </select>
        <select
          value={alertFilters.type}
          onChange={(e) => setAlertFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="">All Types</option>
          <option value="DOWN">DOWN</option>
          <option value="RECOVERED">RECOVERED</option>
        </select>
        <input
          type="datetime-local"
          value={alertFilters.from}
          onChange={(e) => setAlertFilters((f) => ({ ...f, from: e.target.value }))}
        />
        <input
          type="datetime-local"
          value={alertFilters.to}
          onChange={(e) => setAlertFilters((f) => ({ ...f, to: e.target.value }))}
        />
        <button className="primary" type="button" onClick={applyAlertFilters}>
          Apply Filters
        </button>
        <button type="button" onClick={() => downloadReport("alerts", "csv")}>
          Export CSV
        </button>
        <button type="button" onClick={() => downloadReport("alerts", "json")}>
          Export JSON
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Target</th>
              <th>Type</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{new Date(alert.triggeredAt).toLocaleString()}</td>
                <td>{alert.target?.name || "-"}</td>
                <td>
                  <span className={`status-badge ${alert.type === "RECOVERED" ? "up" : "down"}`}>{alert.type}</span>
                </td>
                <td>{alert.message}</td>
              </tr>
            ))}
            {!alerts.length && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No alerts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
