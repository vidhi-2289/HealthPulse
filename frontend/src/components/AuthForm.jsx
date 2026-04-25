import React from 'react';

export default function AuthForm({ authMode, setAuthMode, authForm, setAuthForm, handleAuthSubmit }) {
  return (
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
        <button className="primary" type="submit">
          {authMode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button
          type="button"
          style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', textDecoration: 'underline' }}
          onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
        >
          {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    </section>
  );
}
