import React from 'react';

export default function TargetManager({ 
  targets, targetForm, setTargetForm, editingTargetId, setEditingTargetId, 
  latestCheckByTarget, handleTargetCreate, handleTargetAction, setMessage, defaultTargetForm 
}) {
  return (
    <section className="cards">
      <article className="card" style={{ maxWidth: '400px' }}>
        <h2>{editingTargetId ? "Edit Target" : "Add Target"}</h2>
        <form className="form" onSubmit={handleTargetCreate}>
          <label>
            Name
            <input
              value={targetForm.name}
              onChange={(e) => setTargetForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label>
            URL
            <input
              value={targetForm.url}
              onChange={(e) => setTargetForm((f) => ({ ...f, url: e.target.value }))}
              required
            />
          </label>
          <label>
            Expected Status
            <input
              type="number"
              value={targetForm.expectedStatus}
              onChange={(e) =>
                setTargetForm((f) => ({ ...f, expectedStatus: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            Timeout (ms)
            <input
              type="number"
              value={targetForm.timeoutMs}
              onChange={(e) =>
                setTargetForm((f) => ({ ...f, timeoutMs: Number(e.target.value) }))
              }
            />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="primary" type="submit" style={{ flexGrow: 1 }}>
              {editingTargetId ? "Update Target" : "Create Target"}
            </button>
            {editingTargetId && (
              <button
                type="button"
                onClick={() => {
                  setEditingTargetId(null);
                  setTargetForm(defaultTargetForm);
                  setMessage("Edit cancelled.");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </article>

      <article className="card wide">
        <h2>Existing Targets</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Status</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => {
                const latest = latestCheckByTarget.get(target.id);
                const statusClass = latest?.status === "UP" ? "up" : latest?.status === "DOWN" ? "down" : "nodata";
                return (
                  <tr key={target.id}>
                    <td><strong>{target.name}</strong></td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--color-text-dark)' }}>{target.url}</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {latest?.status || "NO DATA"}
                      </span>
                    </td>
                    <td>{target.isActive ? "Yes" : "No"}</td>
                    <td className="actions">
                      <button onClick={() => handleTargetAction(target.id, "run-now")}>Run now</button>
                      <button
                        onClick={() => {
                          setEditingTargetId(target.id);
                          setTargetForm({
                            name: target.name,
                            url: target.url,
                            method: target.method,
                            intervalSec: target.intervalSec,
                            timeoutMs: target.timeoutMs,
                            expectedStatus: target.expectedStatus,
                          });
                          setMessage(`Editing target "${target.name}"`);
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleTargetAction(target.id, "toggle")}>
                        {target.isActive ? "Disable" : "Enable"}
                      </button>
                      <button className="danger" onClick={() => handleTargetAction(target.id, "delete")}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!targets.length && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No targets yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
