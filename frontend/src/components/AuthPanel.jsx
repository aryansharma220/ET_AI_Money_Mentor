import { useState } from "react";

export default function AuthPanel({ onSignup, onLogin, token, loading, authError }) {
  const [email, setEmail] = useState("demo@aimoneymentor.app");
  const [password, setPassword] = useState("DemoPass123");

  async function handleSignup(event) {
    event.preventDefault();
    await onSignup({ email, password });
  }

  async function handleLogin(event) {
    event.preventDefault();
    await onLogin({ email, password });
  }

  return (
    <div className="workspace-side-panel h-full">
      <h3 className="text-lg font-bold text-white">Account</h3>
      <p className="mt-1 text-sm text-white/75">Login to save and retrieve your generated plans.</p>

      <form className="mt-4 space-y-3" onSubmit={handleLogin}>
        <label className="block text-sm font-semibold text-white/90">
          Email
          <input
            type="email"
            className="workspace-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-semibold text-white/90">
          Password
          <input
            type="password"
            className="workspace-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="submit"
            disabled={loading}
            className="workspace-btn-primary px-4 py-2 text-sm"
          >
            Login
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSignup}
            className="workspace-btn-secondary px-4 py-2 text-sm"
          >
            Sign Up
          </button>
        </div>
      </form>

      <p className="mt-3 text-xs text-white/65">{token ? "Authenticated" : "Not authenticated"}</p>
      {authError ? <p className="mt-2 text-sm text-rose-300">{authError}</p> : null}
    </div>
  );
}
