import { useMemo, useState } from "react";

import AllocationPieChart from "./charts/AllocationPieChart";
import GrowthChart from "./charts/GrowthChart";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function Dashboard({ data, whatIf, baselineHorizonYears }) {
  if (!data) {
    return (
      <div className="workspace-side-panel flex min-h-64 items-center justify-center text-white/75">
        Submit your details to generate your plan.
      </div>
    );
  }

  const {
    plan,
    score,
    priority_actions: actions,
    explanation,
    coach_insight: coachInsight,
    future_simulation: futureSimulation,
    ai_observations: observations = [],
    nudges = [],
    gamification,
    financial_personality: personality,
  } = data;
  const [simpleMode, setSimpleMode] = useState(false);
  const scenarioPlan = whatIf?.updated_plan || null;
  const baselineTimeline = baselineHorizonYears || plan.projection?.at(-1)?.year || 0;
  const scenarioTimeline = scenarioPlan?.projection?.at(-1)?.year || baselineTimeline;
  const healthScoreImpact = scenarioPlan ? 0 : null;
  const simpleExplanation = useMemo(
    () =>
      `If you invest ${formatCurrency(plan.monthly_sip)} every month, you can target about ${formatCurrency(plan.projected_corpus)} in ${baselineTimeline} years. Your money health score is ${score.overall}/100.`,
    [plan.monthly_sip, plan.projected_corpus, baselineTimeline, score.overall],
  );

  return (
    <div className="dashboard-dark space-y-5">
      <CoachHero insight={coachInsight} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Recommended SIP" value={formatCurrency(plan.monthly_sip)} tone="graphite" />
        <MetricCard title="Projected Corpus" value={`You can reach ${formatCurrency(plan.projected_corpus)}`} tone="bronze" />
        <MetricCard title="Money Health Score" value={`${score.overall}/100`} highlight={Boolean(scenarioPlan)} tone="olive" />
      </div>

      <KillerLineCard plan={plan} />

      <ComparisonStrip
        baseline={{
          sip: plan.monthly_sip,
          corpus: plan.projected_corpus,
          timeline: baselineTimeline,
          score: score.overall,
        }}
        scenario={
          scenarioPlan
            ? {
                sip: scenarioPlan.monthly_sip,
                corpus: scenarioPlan.projected_corpus,
                timeline: scenarioTimeline,
                score: score.overall,
              }
            : null
        }
        healthImpact={healthScoreImpact}
        llmSummary={whatIf?.scenario_summary}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <PersonalityCard personality={personality} allocation={plan.allocation} />
        <NudgesCard nudges={nudges} />
        <GamificationCard gamification={gamification} />
      </div>

      <ObservationsCard observations={observations} />

      <FutureStoryCard futureSimulation={futureSimulation} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthChart data={plan.projection} scenarioData={scenarioPlan?.projection} />
        <AllocationPieChart allocation={plan.allocation} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="workspace-side-panel workspace-side-panel-rail panel-accent panel-accent-amber">
          <h3 className="text-lg font-bold text-white">Priority Financial Actions</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/85">
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>

        <div className="workspace-side-panel workspace-side-panel-rail panel-accent panel-accent-ice">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white">AI Explanation</h3>
            <button
              type="button"
              onClick={() => setSimpleMode((prev) => !prev)}
              className="workspace-btn-secondary rounded-full px-3 py-1 text-xs"
            >
              {simpleMode ? "Normal Mode" : "Explain Like I'm 18"}
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/85">{simpleMode ? simpleExplanation : explanation}</p>
        </div>
      </div>
    </div>
  );
}

export function SavePlanCard({ data, onSavePlan, canSave, saveStatus }) {
  return (
    <div className="workspace-side-panel workspace-side-panel-rail panel-accent panel-accent-ice h-full">
      <h3 className="text-lg font-bold text-white">Plan Persistence</h3>
      <p className="mt-1 text-sm text-white/75">Save this deterministic output to your account.</p>
      {!data ? (
        <p className="mt-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80">
          Generate a plan in Personal Plan Studio, then return here to save it.
        </p>
      ) : null}
      <button
        type="button"
        onClick={onSavePlan}
        disabled={!canSave}
        className="workspace-btn-primary mt-4 px-4 py-2 text-sm"
      >
        Save Current Plan
      </button>
      <p className="mt-2 text-xs text-white/65">{saveStatus}</p>
    </div>
  );
}

function MetricCard({ title, value, highlight = false, tone = "graphite" }) {
  const toneClass = {
    graphite: "workspace-tone-graphite",
    bronze: "workspace-tone-bronze",
    olive: "workspace-tone-olive",
    slate: "workspace-tone-slate",
  }[tone] || "workspace-tone-graphite";

  return (
    <div className={`workspace-side-panel workspace-side-panel-hero panel-accent panel-accent-cyan matte-sheen ${toneClass} transform transition-all duration-500 hover:shadow-lg hover:scale-105 ${highlight ? "animate-highlight" : ""}`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-white/70">{title}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function CoachHero({ insight }) {
  if (!insight) {
    return null;
  }

  return (
    <section className={`workspace-side-panel workspace-side-panel-hero panel-accent panel-accent-mint matte-sheen rounded-3xl p-6 transform transition-all duration-500 ${coachHeroToneClass(insight.severity)}`}>
      <p className="text-sm font-semibold text-white/90">
        This system continuously analyzes your financial behavior and guides you toward better decisions.
      </p>
      <div className="mt-3">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">AI Coach Insights</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/65">Based on your income, expenses, and goals</p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-white">{insight.headline}</h2>
        <p className="mt-3 text-sm leading-6 text-white/85">{insight.consequence}</p>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {(insight.fixes || []).map((fix, idx) => (
          <div key={fix} className="rounded-lg border border-white/20 bg-white/12 px-3 py-2 text-sm font-semibold text-white/90" style={{
            animation: `slideIn 0.3s ease-out ${idx * 0.1}s both`
          }}>
            {fix}
          </div>
        ))}
      </div>
    </section>
  );
}

function coachHeroToneClass(severity) {
  if (severity === "high") {
    return "workspace-tone-slate";
  }
  if (severity === "medium") {
    return "workspace-tone-bronze";
  }
  return "workspace-tone-olive";
}

function KillerLineCard({ plan }) {
  if (!plan || !plan.monthly_sip) {
    return null;
  }

  const sipIncrease = 3000;
  const months = 20 * 12;
  const rate = 0.07 / 12;
  
  const futureValue = plan.monthly_sip * (((1 + rate) ** months - 1) / rate);
  const increasedValue = (plan.monthly_sip + sipIncrease) * (((1 + rate) ** months - 1) / rate);
  const gain = increasedValue - futureValue;
  const earlierYears = Math.round((gain / (plan.monthly_sip * 12)) * 0.5);
  
  const basePassiveIncome = (futureValue * 0.03) / 12;
  const increasedPassiveIncome = (increasedValue * 0.03) / 12;
  const passiveIncomeGain = increasedPassiveIncome - basePassiveIncome;

  return (
    <div className="workspace-side-panel workspace-side-panel-hero workspace-tone-bronze panel-accent panel-accent-amber matte-sheen rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-white/70">High Impact Insight</p>
      <p className="mt-2 text-base font-bold leading-6 text-white">
        If you increase SIP by ₹{sipIncrease.toLocaleString()}:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-white/85">
        <li><span className="font-bold text-white">You gain INR {(gain / 100000).toFixed(1)}L extra</span></li>
        <li><span className="font-bold text-white">You reach your goal {Math.max(1, earlierYears)} years sooner</span></li>
        <li><span className="font-bold text-white">Your passive income rises by INR {passiveIncomeGain.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month</span></li>
      </ul>
    </div>
  );
}

function ComparisonStrip({ baseline, scenario, healthImpact, llmSummary }) {
  const sipDelta = scenario ? scenario.sip - baseline.sip : null;
  const corpusDelta = scenario ? scenario.corpus - baseline.corpus : null;
  const timelineDelta = scenario ? scenario.timeline - baseline.timeline : null;
  const scoreDelta = healthImpact;

  const rows = [
    {
      label: "SIP",
      baseline: formatCurrency(baseline.sip),
      scenario: scenario ? formatCurrency(scenario.sip) : "-",
      impact: scenario ? signedCurrency(sipDelta) : "-",
      tone: scenario ? (sipDelta > 0 ? "negative" : sipDelta < 0 ? "positive" : "neutral") : "neutral",
    },
    {
      label: "Projected Corpus",
      baseline: formatCurrency(baseline.corpus),
      scenario: scenario ? formatCurrency(scenario.corpus) : "-",
      impact: scenario ? signedCurrency(corpusDelta) : "-",
      tone: scenario ? (corpusDelta > 0 ? "positive" : corpusDelta < 0 ? "negative" : "neutral") : "neutral",
    },
    {
      label: "Timeline",
      baseline: `${baseline.timeline} years`,
      scenario: scenario ? `${scenario.timeline} years` : "-",
      impact: scenario ? signedYears(timelineDelta) : "-",
      tone: scenario ? (timelineDelta < 0 ? "positive" : timelineDelta > 0 ? "negative" : "neutral") : "neutral",
    },
    {
      label: "Health Score",
      baseline: `${baseline.score}/100`,
      scenario: scenario ? `${scenario.score}/100` : "-",
      impact: healthImpact === null ? "-" : `${healthImpact >= 0 ? "+" : ""}${healthImpact}`,
      tone:
        healthImpact === null
          ? "neutral"
          : healthImpact > 0
            ? "positive"
            : healthImpact < 0
              ? "negative"
              : "neutral",
    },
  ];

  const summary = llmSummary || buildScenarioSummary({ scenario, sipDelta, corpusDelta, timelineDelta, scoreDelta });
  const headline = scenario
    ? corpusDelta >= 0
      ? `You can gain ${signedCurrency(corpusDelta)} with this change.`
      : `You are losing ${signedCurrency(corpusDelta)} with this change.`
    : "Change your SIP or timeline to see your future transform.";
  const headlineTone = scenario ? (corpusDelta >= 0 ? "border-emerald-900/25 bg-emerald-100/70 text-emerald-950" : "border-rose-900/25 bg-rose-100/70 text-rose-950") : "border-ink/10 bg-slate-100 text-ink";

  return (
    <div className="workspace-side-panel workspace-side-panel-hero workspace-tone-slate panel-accent panel-accent-cyan">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-white">See How Small Changes Impact Your Future</h3>
        <p className="text-xs text-white/65">Compare baseline to what-if scenarios.</p>
      </div>

      <p className={`mt-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-700 ${headlineTone}`}>{headline}</p>
      <p className="mt-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/85 transition-all duration-500">{summary}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row, idx) => (
          <div key={row.label} className={`rounded-xl border border-white/15 bg-white/10 p-3 transition-all ${row.scenario !== "-" ? "animate-highlight" : ""}`} style={{
            animationDelay: `${idx * 0.1}s`
          }}>
            <p className="text-xs font-bold uppercase tracking-wider text-white/65">{row.label}</p>
            <p className="mt-2 text-sm text-white/75">Baseline: <span className="font-semibold text-white">{row.baseline}</span></p>
            <p className="mt-1 text-sm text-white/75">What-if: <span className="font-semibold text-white">{row.scenario}</span></p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold font-bold transition-all ${impactBadgeClass(row.tone)} ${row.scenario !== "-" ? "ring-2" : ""}`} style={{
              ringColor: row.tone === "positive" ? "rgba(34, 197, 94, 0.5)" : row.tone === "negative" ? "rgba(239, 68, 68, 0.5)" : "transparent"
            }}>
              Impact: {row.impact}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FutureStoryCard({ futureSimulation }) {
  if (!futureSimulation) {
    return null;
  }

  return (
    <div className="workspace-side-panel workspace-side-panel-rail workspace-tone-olive panel-accent panel-accent-mint">
      <h3 className="text-lg font-bold text-white">Your Future</h3>
      <p className="mt-2 text-sm leading-6 text-white/85">{futureSimulation.narrative}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <FutureMetric label="Projection Year" value={`${futureSimulation.projection_year}`} />
        <FutureMetric label="Projected Corpus" value={formatCurrency(futureSimulation.projected_corpus)} />
        <FutureMetric
          label="Monthly Passive Income"
          value={formatCurrency(futureSimulation.estimated_passive_income_monthly)}
        />
      </div>
    </div>
  );
}

function FutureMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
    </div>
  );
}

function impactBadgeClass(tone) {
  if (tone === "positive") {
    return "bg-emerald-100/80 text-emerald-900";
  }
  if (tone === "negative") {
    return "bg-rose-100/80 text-rose-900";
  }
  return "bg-stone-200/70 text-stone-800";
}

function buildScenarioSummary({ scenario, sipDelta, corpusDelta, timelineDelta, scoreDelta }) {
  if (!scenario) {
    return "Run a What-if scenario to compare expected trade-offs against your baseline plan.";
  }

  const sipText = sipDelta === 0 ? "keeping SIP unchanged" : sipDelta > 0 ? `increasing SIP by ${signedCurrency(sipDelta)}` : `reducing SIP by ${signedCurrency(sipDelta)}`;
  const corpusText =
    corpusDelta === 0
      ? "with no corpus change"
      : corpusDelta > 0
        ? `improves projected corpus by ${signedCurrency(corpusDelta)}`
        : `reduces projected corpus by ${signedCurrency(corpusDelta)}`;
  const timelineText =
    timelineDelta === 0
      ? "with unchanged timeline"
      : timelineDelta > 0
        ? `and extends timeline by ${signedYears(timelineDelta)}`
        : `and shortens timeline by ${signedYears(timelineDelta)}`;
  const scoreText =
    scoreDelta === null ? "Health score remains tied to baseline cashflow inputs." : `Health score impact: ${scoreDelta >= 0 ? "+" : ""}${scoreDelta}.`;

  return `Scenario is ${sipText}; this ${corpusText} ${timelineText}. ${scoreText}`;
}

function signedCurrency(value) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function signedYears(value) {
  if (value === 0) {
    return "0 years";
  }
  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.abs(value)} years`;
}

function PersonalityCard({ personality, allocation }) {
  const details = {
    "Risk Taker": "You prefer higher returns and can tolerate volatility. Your current allocation supports growth, but maintain diversification to reduce concentration risk.",
    "Balanced Planner": "You value growth with stability. Your mix is aligned for long-term consistency while limiting downside shocks.",
    "Conservative Builder": "You prioritize capital protection and predictable progress. Keep equity exposure calibrated so inflation does not erode long-term outcomes.",
  };
  const label = personality || "Balanced Planner";

  return (
    <div className="workspace-side-panel workspace-side-panel-rail workspace-tone-slate panel-accent panel-accent-ice">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/65">Financial Personality</p>
      <p className="mt-3 text-2xl font-black text-white">{label}</p>
      <p className="mt-2 text-sm text-white/80">{details[label] || details["Balanced Planner"]}</p>
      {allocation ? (
        <p className="mt-2 text-xs font-semibold text-white/65">
          Current mix: Equity {allocation.equity}% · Debt {allocation.debt}% · Liquid {allocation.liquid}%
        </p>
      ) : null}
    </div>
  );
}

function ObservationsCard({ observations }) {
  if (!observations || observations.length === 0) {
    return null;
  }
  
  return (
    <div className="workspace-side-panel workspace-side-panel-rail workspace-tone-bronze panel-accent panel-accent-amber">
      <h3 className="text-lg font-bold text-white">AI Observations</h3>
      <ul className="mt-3 space-y-2 text-sm text-white/85">
        {observations.map((item, idx) => (
          <li key={item} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2" style={{
            animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`
          }}>
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NudgesCard({ nudges }) {
  return (
    <div className="workspace-side-panel workspace-side-panel-rail workspace-tone-olive panel-accent panel-accent-mint">
      <h3 className="text-lg font-bold text-white">Micro-Nudges</h3>
      <div className="mt-3 space-y-2">
        {(nudges.length ? nudges : [{ title: "No nudges yet", message: "Run a plan to activate coaching prompts.", severity: "info" }]).map((nudge) => (
          <div key={`${nudge.title}-${nudge.message}`} className={`rounded-xl border px-3 py-2 text-sm ${nudgeClass(nudge.severity)}`}>
            <p className="font-semibold">{nudge.title}</p>
            <p className="mt-1">{nudge.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function nudgeClass(severity) {
  if (severity === "warning") {
    return "border-rose-300/45 bg-rose-500/20 text-rose-100 animate-pulse";
  }
  if (severity === "celebration") {
    return "border-emerald-300/40 bg-emerald-500/18 text-emerald-100";
  }
  return "border-white/20 bg-white/10 text-white/90";
}

function GamificationCard({ gamification }) {
  if (!gamification) {
    return null;
  }

  return (
    <div className="workspace-side-panel workspace-side-panel-rail workspace-tone-graphite panel-accent panel-accent-cyan">
      <h3 className="text-lg font-bold text-white">Your Progress</h3>
      <div className="mt-3 rounded-xl border border-white/20 bg-white/10 p-4">
        <p className="text-sm font-semibold text-white">Financial Discipline: <span className="text-lg font-black text-cyan-200">{gamification.progress_percent}%</span></p>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gradient-to-r from-mint to-stone-500 transition-all duration-500" style={{ width: `${gamification.progress_percent}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-white/70">Performing better than 65% of users</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(gamification.badges || []).map((badge) => (
          <span key={badge.name} className="rounded-full border border-white/20 bg-white/12 px-3 py-2 text-sm font-bold text-white/90">
            {badge.name}
          </span>
        ))}
      </div>
    </div>
  );
}
