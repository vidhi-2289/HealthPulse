import { useEffect, useMemo, useState } from "react";
import "./App.css";

import AuthForm from "./components/AuthForm";
import Navigation from "./components/Navigation";
import DashboardOverview from "./components/DashboardOverview";
import TargetManager from "./components/TargetManager";
import LogsViewer from "./components/LogsViewer";
import AlertsViewer from "./components/AlertsViewer";

const API_BASE = "http://localhost:4000/api";

const navItems = ["Dashboard", "Targets", "Logs", "Alerts"];

const defaultTargetForm = {
  name: "",
  url: "http://demo-target-app:5001/health",
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
        <div className="topbar-content">
          <h1>HealthPulse</h1>
          <p>Automated Application Health Monitoring & Alert System</p>
        </div>
        <span className="badge">Phase 1: Local MVP</span>
      </header>

      {!isAuthed && (
        <AuthForm
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          handleAuthSubmit={handleAuthSubmit}
        />
      )}

      {isAuthed && (
        <>
          <Navigation
            navItems={navItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loadData={loadData}
            seedDemoData={seedDemoData}
            handleLogout={handleLogout}
          />

          <div key={activeTab} className="fade-slide-in">
            {activeTab === "Dashboard" && <DashboardOverview summary={summary} />}

            {activeTab === "Targets" && (
              <TargetManager
                targets={targets}
                targetForm={targetForm}
                setTargetForm={setTargetForm}
                editingTargetId={editingTargetId}
                setEditingTargetId={setEditingTargetId}
                latestCheckByTarget={latestCheckByTarget}
                handleTargetCreate={handleTargetCreate}
                handleTargetAction={handleTargetAction}
                setMessage={setMessage}
                defaultTargetForm={defaultTargetForm}
              />
            )}

            {activeTab === "Logs" && (
              <LogsViewer
                checks={checks}
                targets={targets}
                checkFilters={checkFilters}
                setCheckFilters={setCheckFilters}
                applyCheckFilters={applyCheckFilters}
                downloadReport={downloadReport}
              />
            )}

            {activeTab === "Alerts" && (
              <AlertsViewer
                alerts={alerts}
                targets={targets}
                alertFilters={alertFilters}
                setAlertFilters={setAlertFilters}
                applyAlertFilters={applyAlertFilters}
                downloadReport={downloadReport}
              />
            )}
          </div>

          <div style={{ marginTop: '2rem' }}>
            {loading && <div style={{ color: 'var(--color-text-dark)' }}>Loading data...</div>}
            {message && <div style={{ color: 'var(--color-status-up)', fontWeight: 600, padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '2px', borderLeft: '4px solid var(--color-status-up)' }}>{message}</div>}
            {error && <div style={{ color: 'var(--color-status-down)', fontWeight: 600, padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '2px', borderLeft: '4px solid var(--color-status-down)' }}>{error}</div>}
          </div>
        </>
      )}
    </main>
  );
}

export default App;
