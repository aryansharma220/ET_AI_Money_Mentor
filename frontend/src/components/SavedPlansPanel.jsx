import { useMemo, useState } from "react";

function formatDate(dateTime) {
  return new Date(dateTime).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function SavedPlansPanel({ plans, loading, authenticated }) {
  const [tab, setTab] = useState("recent");

  const rankedPlans = useMemo(() => {
    const list = [...plans];
    if (tab === "best-score") {
      list.sort((a, b) => (b?.plan_output?.score?.overall || 0) - (a?.plan_output?.score?.overall || 0));
      return list;
    }
    if (tab === "highest-corpus") {
      list.sort(
        (a, b) =>
          (b?.plan_output?.plan?.projected_corpus || 0) -
          (a?.plan_output?.plan?.projected_corpus || 0),
      );
      return list;
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [plans, tab]);

  const visiblePlans = rankedPlans.slice(0, 20);

  return (
    <div className="workspace-side-panel h-full">
      <h3 className="text-lg font-bold text-white">Saved Plans</h3>
      <p className="mt-1 text-sm text-white/75">Recent snapshots for your authenticated account.</p>

      {!authenticated ? <p className="mt-3 text-sm text-white/75">Login to view saved plans.</p> : null}
      {authenticated && loading ? <p className="mt-3 text-sm text-white/75">Loading saved plans...</p> : null}
      {authenticated && !loading && plans.length === 0 ? (
        <p className="mt-3 text-sm text-white/75">No plans saved yet.</p>
      ) : null}

      {authenticated && plans.length > 0 ? (
        <>
          <div className="mt-3 inline-flex rounded-lg border border-white/20 bg-white/10 p-1 text-xs font-semibold text-white/85">
            <button
              type="button"
              onClick={() => setTab("recent")}
              className={`rounded-md px-2.5 py-1.5 transition ${
                tab === "recent" ? "bg-white text-slate-900" : "hover:bg-white/15"
              }`}
            >
              Recent
            </button>
            <button
              type="button"
              onClick={() => setTab("best-score")}
              className={`rounded-md px-2.5 py-1.5 transition ${
                tab === "best-score" ? "bg-white text-slate-900" : "hover:bg-white/15"
              }`}
            >
              Best Score
            </button>
            <button
              type="button"
              onClick={() => setTab("highest-corpus")}
              className={`rounded-md px-2.5 py-1.5 transition ${
                tab === "highest-corpus" ? "bg-white text-slate-900" : "hover:bg-white/15"
              }`}
            >
              Highest Corpus
            </button>
          </div>

          <p className="mt-2 text-xs text-white/65">Showing latest {visiblePlans.length} of {plans.length}</p>
          <div className="saved-plans-scroll mt-3 space-y-2.5 pr-1">
          {visiblePlans.map((plan) => (
            <div key={plan.id} className="workspace-note p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{formatDate(plan.created_at)}</p>
              <p className="mt-1 text-sm font-semibold text-white/95">
                SIP {formatCurrency(plan.plan_output.plan.monthly_sip)} | Corpus {" "}
                {formatCurrency(plan.plan_output.plan.projected_corpus)}
              </p>
              <p className="mt-1 text-xs text-white/70">Health Score: {plan.plan_output.score.overall}/100</p>
            </div>
          ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
