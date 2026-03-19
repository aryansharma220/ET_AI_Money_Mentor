import { useEffect, useMemo, useState } from "react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function WhatIfPanel({
  planInput,
  baselinePlan,
  scenario,
  loading,
  error,
  onRunScenario,
  onRunIncomeStress,
  stressScenario,
  stressLoading,
  stressError,
}) {
  const [increaseSipPercent, setIncreaseSipPercent] = useState(10);
  const [changeYears, setChangeYears] = useState(planInput?.investment_horizon_years || 10);

  useEffect(() => {
    if (planInput?.investment_horizon_years) {
      setChangeYears(planInput.investment_horizon_years);
    }
  }, [planInput?.investment_horizon_years]);

  const canRun = Boolean(planInput && baselinePlan) && !loading;
  const canRunStress = Boolean(planInput && baselinePlan) && !stressLoading;

  const scenarioLabel = useMemo(() => {
    if (!planInput) {
      return "Generate a base plan first.";
    }
    return `Base Horizon: ${planInput.investment_horizon_years} years`;
  }, [planInput]);

  function handleRun() {
    if (!planInput) {
      return;
    }

    const modification = {
      increase_sip_percent: Number(increaseSipPercent),
      change_horizon_years: Number(changeYears),
    };
    onRunScenario(modification);
  }

  return (
    <div className="workspace-side-panel space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">What-if Scenario Analysis</h3>
        <p className="text-sm text-white/75">Adjust SIP and timeline to compare outcomes against your current plan.</p>
      </div>

      <div className="workspace-note p-3 text-sm text-white/80">{scenarioLabel}</div>

      <label className="block text-sm font-semibold text-white/90">
        Increase SIP (%): {increaseSipPercent}%
        <input
          className="mt-2 w-full accent-mint"
          type="range"
          min={0}
          max={100}
          step={1}
          value={increaseSipPercent}
          onChange={(event) => setIncreaseSipPercent(Number(event.target.value))}
          disabled={!planInput}
        />
      </label>

      <label className="block text-sm font-semibold text-white/90">
        New Timeline (years)
        <input
          className="workspace-input"
          type="number"
          min={1}
          max={50}
          value={changeYears}
          onChange={(event) => setChangeYears(Number(event.target.value))}
          disabled={!planInput}
        />
      </label>

      <button
        type="button"
        onClick={handleRun}
        disabled={!canRun}
        className="workspace-btn-primary w-full px-4 py-2 text-sm"
      >
        {loading ? "Running Scenario..." : "Run What-if"}
      </button>

      <button
        type="button"
        onClick={onRunIncomeStress}
        disabled={!canRunStress}
        className="workspace-btn-secondary w-full px-4 py-2 text-sm"
      >
        {stressLoading ? "Running Income Stress Test..." : "Run Income Drop Stress Test (-20%)"}
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {stressError ? <p className="text-sm text-rose-300">{stressError}</p> : null}

      {scenario ? (
        <div className="workspace-note space-y-3 p-3">
          <p className="text-sm font-bold text-white">Scenario Result</p>
          {scenario.whatif_impact_message ? (
            <p className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white/90">
              {scenario.whatif_impact_message}
            </p>
          ) : null}
          <p className="text-sm text-white/85">
            New SIP: {formatCurrency(scenario.updated_plan.monthly_sip)} | New Corpus: {" "}
            {formatCurrency(scenario.updated_plan.projected_corpus)}
          </p>
          <p className="text-sm text-white/85">
            Delta SIP: {formatCurrency(scenario.delta.monthly_sip_delta)} | Delta Corpus: {" "}
            {formatCurrency(scenario.delta.projected_corpus_delta)}
          </p>
          <p className="text-sm text-white/85">Horizon Delta: {scenario.delta.horizon_delta_years} years</p>
          <p className="text-sm text-white/75">{scenario.explanation}</p>

          {scenario.nudges?.length ? (
            <div className="rounded-xl border border-white/15 bg-white/10 p-2">
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">Scenario Nudges</p>
              <ul className="mt-2 space-y-1 text-sm text-white/85">
                {scenario.nudges.slice(0, 2).map((nudge) => (
                  <li key={`${nudge.title}-${nudge.message}`}>{nudge.title}: {nudge.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {scenario.gamification ? (
            <div className="rounded-xl border border-white/15 bg-white/10 p-2">
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                Reward Impact: {scenario.gamification.points} points | {scenario.gamification.progress_percent}% progress
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {stressScenario && baselinePlan ? (
        <div className="space-y-2 rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-sm font-bold text-white">Income Drop Stress Test Result</p>
          <p className="text-sm text-white/85">
            Baseline SIP: {formatCurrency(baselinePlan.monthly_sip)} | Stressed SIP: {formatCurrency(stressScenario.plan.monthly_sip)}
          </p>
          <p className="text-sm text-white/85">
            Baseline Corpus: {formatCurrency(baselinePlan.projected_corpus)} | Stressed Corpus: {formatCurrency(stressScenario.plan.projected_corpus)}
          </p>
          <p className="text-sm font-semibold text-rose-300">
            Corpus impact under 20% income drop: {formatCurrency(stressScenario.plan.projected_corpus - baselinePlan.projected_corpus)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
