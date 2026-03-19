export default function LandingPage({ onStartPersonal, onStartOptimizer, onViewDemo }) {
  return (
    <div className="landing-shell">
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-orb landing-orb-three" />

      <header className="landing-reveal mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/25 bg-white/15 px-5 py-3 backdrop-blur-md">
        <p className="text-sm font-bold tracking-wide text-white">Financial Journey</p>
        <div className="hidden items-center gap-6 text-xs font-semibold text-white/85 md:flex">
          <p>Personal Studio</p>
          <p>Goal Optimizer</p>
          <p>Risk Insights</p>
          <p>Secure Data</p>
        </div>
        <button
          type="button"
          onClick={onStartPersonal}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-white/90"
        >
          Launch
        </button>
      </header>

      <section className="landing-reveal mx-auto mt-12 max-w-4xl text-center text-white" style={{ animationDelay: "120ms" }}>
        <p className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          Intelligent Wealth System
        </p>
        <h1 className="landing-hero-title mt-6 text-5xl font-black leading-tight md:text-7xl">
          Plan With Clarity.
          <br />
          Decide With Confidence.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
          A deterministic financial engine paired with behavioral intelligence, what-if simulation, and
          dependency-aware multi-goal optimization.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onStartPersonal}
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl transition hover:-translate-y-0.5"
          >
            Enter Personal Plan Studio
          </button>
          <button
            type="button"
            onClick={onStartOptimizer}
            className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Open Advanced Goal Optimizer
          </button>
          <button
            type="button"
            onClick={onViewDemo}
            className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white/90 transition hover:bg-white/10"
          >
            View Guided Demo
          </button>
        </div>
      </section>

      <section className="landing-reveal landing-grid-stagger mx-auto mt-16 grid max-w-6xl gap-4 md:grid-cols-3" style={{ animationDelay: "220ms" }}>
        <article className="landing-card">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Chapter One</p>
          <h3 className="mt-2 text-2xl font-black text-white">Automated Planning</h3>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Build a deterministic baseline plan from your cashflow and risk profile in seconds.
          </p>
        </article>
        <article className="landing-card">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Chapter Two</p>
          <h3 className="mt-2 text-2xl font-black text-white">Predictive Scenarios</h3>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Stress-test your plan with what-if modeling and income-shock simulation before you commit.
          </p>
        </article>
        <article className="landing-card">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Chapter Three</p>
          <h3 className="mt-2 text-2xl font-black text-white">Goal Dependency Graph</h3>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Visualize blocked goals, linked targets, and the critical path that unlocks progress fastest.
          </p>
        </article>
      </section>

      <section className="landing-reveal landing-grid-stagger mx-auto mt-16 grid max-w-6xl gap-4 md:grid-cols-4" style={{ animationDelay: "300ms" }}>
        <MetricTile label="Decision Engine" value="Deterministic" />
        <MetricTile label="Behavior Layer" value="Adaptive" />
        <MetricTile label="Scenario Analysis" value="Real-Time" />
        <MetricTile label="Security Standard" value="Bank-Grade" />
      </section>

      <footer className="landing-reveal mx-auto mt-16 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-6 text-xs text-white/70" style={{ animationDelay: "360ms" }}>
        <p>AI Money Mentor</p>
        <p>A financial decision engine for modern planning journeys.</p>
      </footer>
    </div>
  );
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 p-4 text-center backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
