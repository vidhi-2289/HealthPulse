import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:4000/api";

const navItems = ["Dashboard", "Targets", "Logs", "Alerts"];

const defaultTargetForm = {
  name: "",
  url: "http://localhost:5001/health",
  method: "GET",
  intervalSec: 30,
  timeoutMs: 5000,
  expectedStatus: 200,
};

async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(json?.message || `Request failed: ${response.status}`);
  }
  return json;
}

function buildQuery(paramsObj) {
  const params = new URLSearchParams();
  Object.entries(paramsObj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("hp_token") || "");
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [targets, setTargets] = useState([]);
  const [checks, setChecks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [targetForm, setTargetForm] = useState(defaultTargetForm);
  const [editingTargetId, setEditingTargetId] = useState(null);
  const [checkFilters, setCheckFilters] = useState({
    targetId: "",
    status: "",
    from: "",
    to: "",
  });
  const [alertFilters, setAlertFilters] = useState({
    targetId: "",
    type: "",
    from: "",
    to: "",
  });

  const isAuthed = Boolean(token);

  const latestCheckByTarget = useMemo(() => {
    const map = new Map();
    checks.forEach((check) => {
      if (!map.has(check.targetId)) map.set(check.targetId, check);
    });
    return map;
  }, [checks]);

  async function loadData(currentToken = token) {
    if (!currentToken) return;
    setLoading(true);
    setError("");
    try {
      const [meData, summaryData, targetsData, checksData, alertsData] = await Promise.all([
        api("/auth/me", { token: currentToken }),
        api("/dashboard/summary", { token: currentToken }),
        api("/targets", { token: currentToken }),
        api("/checks", { token: currentToken }),
        api("/alerts", { token: currentToken }),
      ]);
      setUser(meData.user);
      setSummary(summaryData.summary);
      setTargets(targetsData.targets);
      setChecks(checksData.checks);
      setAlerts(alertsData.alerts);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("token")) handleLogout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : authForm;
      const data = await api(path, {
        method: "POST",
        body: payload,
      });
      localStorage.setItem("hp_token", data.token);
      setToken(data.token);
      setAuthForm({ name: "", email: "", password: "" });
      setMessage(`Logged in as ${data.user.email}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("hp_token");
    setToken("");
    setUser(null);
    setSummary(null);
    setTargets([]);
    setChecks([]);
    setAlerts([]);
    setActiveTab("Dashboard");
    setMessage("Logged out.");
  }

  async function handleTargetCreate(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingTargetId) {
        await api(`/targets/${editingTargetId}`, {
          method: "PUT",
          token,
          body: targetForm,
        });
        setMessage("Target updated.");
        setEditingTargetId(null);
      } else {
        await api("/targets", { method: "POST", token, body: targetForm });
        setMessage("Target created.");
      }
      setTargetForm(defaultTargetForm);
      await loadData();
      setActiveTab("Targets");
    } catch (err) {
      setError(err.message);
    }
  }

  async function applyCheckFilters() {
    setError("");
    try {
      const query = buildQuery({
        targetId: checkFilters.targetId,
        status: checkFilters.status,
        from: checkFilters.from ? new Date(checkFilters.from).toISOString() : "",
        to: checkFilters.to ? new Date(checkFilters.to).toISOString() : "",
      });
      const data = await api(`/checks${query}`, { token });
      setChecks(data.checks);
      setMessage("Log filters applied.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function applyAlertFilters() {
    setError("");
    try {
      const query = buildQuery({
        targetId: alertFilters.targetId,
        type: alertFilters.type,
        from: alertFilters.from ? new Date(alertFilters.from).toISOString() : "",
        to: alertFilters.to ? new Date(alertFilters.to).toISOString() : "",
      });
      const data = await api(`/alerts${query}`, { token });
      setAlerts(data.alerts);
      setMessage("Alert filters applied.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadReport(kind, format) {
    const filters =
      kind === "checks"
        ? {
            targetId: checkFilters.targetId,
            status: checkFilters.status,
            from: checkFilters.from ? new Date(checkFilters.from).toISOString() : "",
            to: checkFilters.to ? new Date(checkFilters.to).toISOString() : "",
            format,
          }
        : {
            targetId: alertFilters.targetId,
            type: alertFilters.type,
            from: alertFilters.from ? new Date(alertFilters.from).toISOString() : "",
            to: alertFilters.to ? new Date(alertFilters.to).toISOString() : "",
            format,
          };
    const query = buildQuery(filters);
    try {
      const response = await fetch(`${API_BASE}/reports/${kind}${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = format === "csv" ? "csv" : "json";
      link.href = url;
      link.download = `${kind}-report.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`${kind} report exported (${format.toUpperCase()}).`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTargetAction(targetId, action) {
    setError("");
    setMessage("");
    try {
      if (action === "toggle") {
        await api(`/targets/${targetId}/toggle`, { method: "PATCH", token });
      }
      if (action === "run-now") {
        await api(`/checks/run-now/${targetId}`, { method: "POST", token });
      }
      if (action === "delete") {
        await api(`/targets/${targetId}`, { method: "DELETE", token });
      }
      setMessage(`Action "${action}" completed.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function seedDemoData() {
    setError("");
    setMessage("");
    try {
      const result = await api("/demo/seed", { method: "POST", token });
      setMessage(
        `${result.message} Targets: ${result.createdTargets}, initial checks: ${result.createdChecks}.`,
      );
      await loadData();
      setActiveTab("Dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="layout">
      <header className="topbar">
        <div>
          <h1>HealthPulse</h1>
          <p>Automated Application Health Monitoring & Alert System</p>
        </div>
        <span className="badge">Phase 1: Local MVP</span>
      </header>

      {!isAuthed && (
        <section className="card auth-card">
          <h2>{authMode === "login" ? "Login" : "Register"}</h2>
          <form className="form" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <label>
                Name
                <input
                  value={authForm.name}
                  onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </label>
            <button type="submit">{authMode === "login" ? "Sign In" : "Create Account"}</button>
          </form>
          <button
            type="button"
            className="text-button"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </button>
        </section>
      )}

      {isAuthed && (
        <>
          <nav className="nav">
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
            <button type="button" onClick={loadData}>
              Refresh
            </button>
            <button type="button" onClick={seedDemoData}>
              Seed Demo Data
            </button>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </nav>

          <p className="user-line">
            Signed in as <strong>{user?.email || "..."}</strong>
          </p>

          {activeTab === "Dashboard" && (
            <section className="cards">
              <article className="card">
                <h2>Overview</h2>
                <ul>
                  <li>Total targets: {summary?.totalTargets ?? 0}</li>
                  <li>Active targets: {summary?.activeTargets ?? 0}</li>
                  <li>Total checks: {summary?.totalChecks ?? 0}</li>
                  <li>Uptime: {summary?.uptimePercent ?? 0}%</li>
                </ul>
              </article>
              <article className="card">
                <h2>Monitor Endpoints</h2>
                <ul>
                  <li>Backend API: http://localhost:4000/api/health</li>
                  <li>Demo app: http://localhost:5001/health</li>
                  <li>Scheduler: every 60 seconds</li>
                </ul>
              </article>
              <article className="card">
                <h2>Latest Status by Target</h2>
                {summary?.latestChecksByTarget?.length ? (
                  <ul>
                    {summary.latestChecksByTarget.map((row) => (
                      <li key={row.targetId}>
                        {row.targetName}:{" "}
                        <span className={row.latestStatus === "UP" ? "up" : "down"}>
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
          )}

          {activeTab === "Targets" && (
            <section className="cards">
              <article className="card">
                <h2>Add Target</h2>
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
                  <button type="submit">{editingTargetId ? "Update Target" : "Create Target"}</button>
                  {editingTargetId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTargetId(null);
                        setTargetForm(defaultTargetForm);
                        setMessage("Edit cancelled.");
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
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
                        return (
                          <tr key={target.id}>
                            <td>{target.name}</td>
                            <td className="mono">{target.url}</td>
                            <td>
                              <span className={latest?.status === "UP" ? "up" : "down"}>
                                {latest?.status || "NO_DATA"}
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
                          <td colSpan="5">No targets yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          )}

          {activeTab === "Logs" && (
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
                <button type="button" onClick={applyCheckFilters}>
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
                          <span className={check.status === "UP" ? "up" : "down"}>{check.status}</span>
                        </td>
                        <td>{check.statusCode ?? "-"}</td>
                        <td>{check.responseTimeMs ?? "-"}</td>
                        <td>{check.errorMessage || "-"}</td>
                      </tr>
                    ))}
                    {!checks.length && (
                      <tr>
                        <td colSpan="6">No checks yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "Alerts" && (
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
                <button type="button" onClick={applyAlertFilters}>
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
                        <td>{alert.type}</td>
                        <td>{alert.message}</td>
                      </tr>
                    ))}
                    {!alerts.length && (
                      <tr>
                        <td colSpan="4">No alerts yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {(error || message || loading) && (
        <section className="status-line">
          {loading && <span>Loading data...</span>}
          {message && <span className="success">{message}</span>}
          {error && <span className="error">{error}</span>}
        </section>
      )}
    </main>
  );
}

export default App;
