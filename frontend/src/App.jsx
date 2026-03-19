import { useEffect, useMemo, useState } from "react";

import AuthPanel from "./components/AuthPanel";
import Dashboard, { SavePlanCard } from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import MultiGoalPlanner from "./components/MultiGoalPlanner";
import OnboardingForm from "./components/OnboardingForm";
import SavedPlansPanel from "./components/SavedPlansPanel";
import WhatIfPanel from "./components/WhatIfPanel";
import {
  generateMultiGoalPlan,
  generatePlan,
  generateWhatIf,
  listSavedPlans,
  login,
  savePlan,
  signup,
} from "./services/api";

export default function App() {
  const [activeView, setActiveView] = useState("landing");
  const [activePage, setActivePage] = useState("personal");

  const [planResponse, setPlanResponse] = useState(null);
  const [lastPlanInput, setLastPlanInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [token, setToken] = useState(localStorage.getItem("aimm_token") || "");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [savedPlans, setSavedPlans] = useState([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Login to enable plan persistence.");

  const [whatIfResponse, setWhatIfResponse] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState("");

  const [stressPlanResponse, setStressPlanResponse] = useState(null);
  const [stressLoading, setStressLoading] = useState(false);
  const [stressError, setStressError] = useState("");

  const [multiGoalResponse, setMultiGoalResponse] = useState(null);
  const [multiGoalLoading, setMultiGoalLoading] = useState(false);
  const [multiGoalError, setMultiGoalError] = useState("");

  const [showExplainPlan, setShowExplainPlan] = useState(false);

  const workspaceThemeClass = useMemo(() => {
    if (activePage === "optimizer") {
      return "workspace-shell workspace-shell-optimizer";
    }
    if (activePage === "vault") {
      return "workspace-shell workspace-shell-vault";
    }
    return "workspace-shell workspace-shell-personal";
  }, [activePage]);

  async function handleGeneratePlan(payload) {
    setLoading(true);
    setError("");
    try {
      const response = await generatePlan(payload);
      setPlanResponse(response);
      setLastPlanInput(payload);
      setWhatIfResponse(null);
      setWhatIfError("");
      setStressPlanResponse(null);
      setStressError("");
    } catch (err) {
      setError(err.message || "Unable to generate your plan right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWhatIf(modification) {
    if (!lastPlanInput) {
      setWhatIfError("Generate a base plan first.");
      return;
    }

    setWhatIfLoading(true);
    setWhatIfError("");
    try {
      const response = await generateWhatIf({
        original_plan: lastPlanInput,
        modification,
      });
      setWhatIfResponse(response);
    } catch (err) {
      setWhatIfError(err.message || "Unable to run what-if scenario.");
    } finally {
      setWhatIfLoading(false);
    }
  }

  async function handleIncomeDropStressTest() {
    if (!lastPlanInput) {
      setStressError("Generate a base plan first.");
      return;
    }

    const stressedIncome = Math.round(lastPlanInput.monthly_income * 0.8);
    if (lastPlanInput.monthly_expenses >= stressedIncome) {
      setStressError("Income drop scenario invalid: expenses exceed reduced income. Reduce expenses or adjust base input.");
      return;
    }

    setStressLoading(true);
    setStressError("");
    try {
      const response = await generatePlan({
        ...lastPlanInput,
        monthly_income: stressedIncome,
      });
      setStressPlanResponse(response);
    } catch (err) {
      setStressError(err.message || "Unable to run income-drop stress test.");
    } finally {
      setStressLoading(false);
    }
  }

  async function handleMultiGoalPlan(payload) {
    setMultiGoalLoading(true);
    setMultiGoalError("");
    try {
      const response = await generateMultiGoalPlan(payload);
      setMultiGoalResponse(response);
    } catch (err) {
      setMultiGoalError(err.message || "Unable to generate multi-goal plan.");
    } finally {
      setMultiGoalLoading(false);
    }
  }

  async function handleSignup(credentials) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await signup(credentials);
      setToken(response.access_token);
      localStorage.setItem("aimm_token", response.access_token);
      setSaveStatus("Signed up and authenticated.");
    } catch (err) {
      setAuthError(err.message || "Signup failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(credentials) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await login(credentials);
      setToken(response.access_token);
      localStorage.setItem("aimm_token", response.access_token);
      setSaveStatus("Logged in successfully.");
    } catch (err) {
      setAuthError(err.message || "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function fetchSavedPlans(activeToken) {
    if (!activeToken) {
      setSavedPlans([]);
      return;
    }

    setSavedPlansLoading(true);
    try {
      const response = await listSavedPlans(activeToken);
      setSavedPlans(response);
    } catch {
      setSavedPlans([]);
    } finally {
      setSavedPlansLoading(false);
    }
  }

  async function handleSavePlan() {
    if (!token || !planResponse || !lastPlanInput) {
      setSaveStatus("Generate a plan and login first.");
      return;
    }

    setSaveStatus("Saving...");
    try {
      await savePlan(
        {
          plan_input: lastPlanInput,
          plan_output: planResponse,
        },
        token,
      );
      setSaveStatus("Plan saved successfully.");
      await fetchSavedPlans(token);
    } catch (err) {
      setSaveStatus(err.message || "Could not save plan.");
    }
  }

  useEffect(() => {
    fetchSavedPlans(token);
  }, [token]);

  const assumptions = useMemo(
    () => [
      "Equity return: 12% annual",
      "Debt return: 6% annual",
      "Inflation: 5% annual",
      "All math is deterministic in backend",
    ],
    [],
  );

  function formatInr(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  const explainPlan = useMemo(() => {
    if (activePage === "personal") {
      if (!planResponse?.plan || !lastPlanInput) {
        return {
          title: "Personal Plan Explanation",
          points: [
            "No personal plan is available yet.",
            "Submit your financial snapshot to generate a baseline recommendation.",
            "After that, this section will explain how SIP, allocation, score, and scenario deltas were derived.",
          ],
        };
      }

      const surplus = Math.max(0, lastPlanInput.monthly_income - lastPlanInput.monthly_expenses);
      const sipShare = surplus > 0 ? Math.round((planResponse.plan.monthly_sip / surplus) * 100) : null;
      const allocation = planResponse.plan.allocation;

      const points = [
        `Baseline recommendation is ${formatInr(planResponse.plan.monthly_sip)} SIP for a target corpus of ${formatInr(planResponse.plan.projected_corpus)} over ${lastPlanInput.investment_horizon_years} years.`,
        `Monthly surplus from your input is ${formatInr(surplus)}${sipShare !== null ? `, and the SIP uses about ${sipShare}% of that surplus.` : "."}`,
        `Allocation logic currently sets Equity ${allocation.equity}%, Debt ${allocation.debt}%, Liquid ${allocation.liquid}% based on your risk profile (${lastPlanInput.risk_appetite}).`,
        `Money health score is ${planResponse.score.overall}/100, with priority actions generated from the same deterministic baseline inputs.`,
      ];

      if (whatIfResponse?.delta) {
        points.push(
          `Latest what-if run changed projected corpus by ${formatInr(whatIfResponse.delta.projected_corpus_delta)} and timeline by ${whatIfResponse.delta.horizon_delta_years} years versus baseline.`,
        );
      } else {
        points.push("No what-if scenario is currently applied; comparisons are against the baseline plan only.");
      }

      return {
        title: "Personal Plan Explanation",
        points,
      };
    }

    if (activePage === "optimizer") {
      if (!multiGoalResponse?.goals?.length) {
        return {
          title: "Optimizer Explanation",
          points: [
            "No multi-goal optimization result is available yet.",
            "Add goals and run the optimizer to see capacity allocation and dependency-based reasoning.",
          ],
        };
      }

      const totalRequired = multiGoalResponse.total_required || 0;
      const totalAllocated = multiGoalResponse.total_allocated || 0;
      const coverage = totalRequired > 0 ? Math.round((totalAllocated / totalRequired) * 100) : 0;
      const fullyFunded = multiGoalResponse.goals.filter((g) => g.status === "fully_funded").length;
      const partiallyFunded = multiGoalResponse.goals.filter((g) => g.status === "partially_funded").length;
      const unfunded = multiGoalResponse.goals.filter((g) => g.status === "unfunded").length;
      const blocked = multiGoalResponse.goals.filter((g) => g.is_blocked).length;

      return {
        title: "Optimizer Explanation",
        points: [
          `Optimizer capacity is ${formatInr(multiGoalResponse.total_capacity)} per month, with required ${formatInr(totalRequired)} and allocated ${formatInr(totalAllocated)} (${coverage}% coverage).`,
          `Funding outcomes: ${fullyFunded} fully funded, ${partiallyFunded} partially funded, ${unfunded} unfunded goals.`,
          `Dependency analysis identifies ${blocked} blocked goal(s) that are constrained by predecessor goals in the graph.`,
          `Delay-by-one-year simulation is shown for non-fully-funded goals to quantify monthly SIP relief from timeline adjustment.`,
        ],
      };
    }

    return {
      title: "Account Vault Explanation",
      points: [
        token ? "You are authenticated; save and retrieval actions are enabled." : "You are not authenticated; save/retrieval is disabled until login.",
        `${savedPlans.length} saved plan snapshot(s) are currently available in your account view.`,
        "Saved Plans tabs are sorted views of the same dataset: Recent, Best Score, and Highest Corpus.",
      ],
    };
  }, [activePage, lastPlanInput, multiGoalResponse, planResponse, savedPlans.length, token, whatIfResponse]);

  function openPersonalPage() {
    setActivePage("personal");
    setActiveView("workspace");
  }

  function openOptimizerPage() {
    setActivePage("optimizer");
    setActiveView("workspace");
  }

  function openGuidedDemo() {
    setActivePage("personal");
    setActiveView("workspace");
    setShowExplainPlan(true);
  }

  if (activeView === "landing") {
    return (
      <main className="landing-screen">
        <LandingPage
          onStartPersonal={openPersonalPage}
          onStartOptimizer={openOptimizerPage}
          onViewDemo={openGuidedDemo}
        />
      </main>
    );
  }

  return (
    <main className={workspaceThemeClass}>
      <div className="workspace-orb workspace-orb-one" />
      <div className="workspace-orb workspace-orb-two" />

      <div className="workspace-layout mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="workspace-header workspace-reveal-section mb-6" style={{ animationDelay: "60ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-block rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/80">
                Decision Engine Workspace
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">AI Money Mentor</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                Deterministic finance planning with AI-powered intelligence, scenario modeling, and constrained goal optimization.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView("landing")}
              className="rounded-full border border-white/35 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              Back to Landing
            </button>
          </div>

          <nav className="mt-4 inline-flex rounded-xl border border-white/30 bg-white/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setActivePage("personal")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activePage === "personal" ? "bg-white text-slate-900" : "text-white/85 hover:bg-white/20"
              }`}
            >
              Personal Plan Studio
            </button>
            <button
              type="button"
              onClick={() => setActivePage("optimizer")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activePage === "optimizer" ? "bg-white text-slate-900" : "text-white/85 hover:bg-white/20"
              }`}
            >
              Advanced Goal Optimizer
            </button>
            <button
              type="button"
              onClick={() => setActivePage("vault")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activePage === "vault" ? "bg-white text-slate-900" : "text-white/85 hover:bg-white/20"
              }`}
            >
              Account Vault
            </button>
          </nav>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowExplainPlan((prev) => !prev)}
              className="rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/25"
            >
              {showExplainPlan ? "Hide Explain Plan" : "Explain Plan"}
            </button>
          </div>

          {showExplainPlan ? (
            <div className="mt-3 rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">{explainPlan.title}</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-white/85">
                {explainPlan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </header>

        {activePage === "personal" ? (
          <>
            <section className="workspace-section workspace-reveal-section mb-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm" style={{ animationDelay: "120ms" }}>
              <p className="section-kicker">Planning Zone</p>
              <h2 className="text-xl font-black text-white">Personal Financial Plan</h2>
              <p className="mt-1 text-sm text-white/80">
                Behavioral insight, simulation, and stress-tested planning for an individual profile.
              </p>
            </section>

            <section className="workspace-zone-planning workspace-reveal-section mb-6" style={{ animationDelay: "180ms" }}>
              <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
                <OnboardingForm onSubmit={handleGeneratePlan} loading={loading} />
                {loading && !planResponse ? (
                  <CoachThinkingCard />
                ) : (
                  <Dashboard
                    data={planResponse ? { ...planResponse } : null}
                    whatIf={whatIfResponse}
                    baselineHorizonYears={lastPlanInput?.investment_horizon_years}
                  />
                )}
              </div>
              <hr className="section-divider" />
            </section>

            <section className="workspace-zone-planning workspace-reveal-section mb-6" style={{ animationDelay: "320ms" }}>
              <WhatIfPanel
                planInput={lastPlanInput}
                baselinePlan={planResponse?.plan}
                scenario={whatIfResponse}
                loading={whatIfLoading}
                error={whatIfError}
                onRunScenario={handleWhatIf}
                onRunIncomeStress={handleIncomeDropStressTest}
                stressScenario={stressPlanResponse}
                stressLoading={stressLoading}
                stressError={stressError}
              />
            </section>
          </>
        ) : activePage === "optimizer" ? (
          <>
            <section className="workspace-section workspace-reveal-section mb-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm" style={{ animationDelay: "120ms" }}>
              <p className="section-kicker">Optimization Zone</p>
              <h2 className="text-xl font-black text-white">Advanced Multi-Goal Optimizer</h2>
              <p className="mt-1 text-sm text-white/80">
                Constraint-based allocation and dependency-aware planning across competing goals.
              </p>
            </section>

            <section className="workspace-zone-optimizer workspace-reveal-section mb-6" style={{ animationDelay: "190ms" }}>
              <MultiGoalPlanner
                data={multiGoalResponse}
                loading={multiGoalLoading}
                error={multiGoalError}
                onRun={handleMultiGoalPlan}
              />
            </section>
          </>
        ) : (
          <>
            <section className="workspace-section workspace-reveal-section mb-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm" style={{ animationDelay: "120ms" }}>
              <p className="section-kicker">System Zone</p>
              <h2 className="text-xl font-black text-white">Account Vault</h2>
              <p className="mt-1 text-sm text-white/80">
                Authentication, plan persistence, and searchable saved snapshots in one place.
              </p>
            </section>

            <section className="workspace-zone-system workspace-reveal-section workspace-card-stagger mb-6 grid gap-5 lg:grid-cols-3 lg:items-stretch" style={{ animationDelay: "190ms" }}>
              <AuthPanel
                onSignup={handleSignup}
                onLogin={handleLogin}
                token={token}
                loading={authLoading}
                authError={authError}
              />
              <SavePlanCard
                data={planResponse}
                onSavePlan={handleSavePlan}
                canSave={Boolean(token && planResponse)}
                saveStatus={saveStatus}
              />
              <SavedPlansPanel plans={savedPlans} loading={savedPlansLoading} authenticated={Boolean(token)} />
            </section>
          </>
        )}

        {error ? <p className="glass-card workspace-reveal-card border-red-400 text-sm text-red-700" style={{ animationDelay: "350ms" }}>{error}</p> : null}

        <section className="workspace-zone-system workspace-reveal-card mt-6" style={{ animationDelay: "390ms" }}>
          <div className="workspace-side-panel workspace-side-panel-rail panel-accent panel-accent-ice">
          <h3 className="text-lg font-bold text-white">Model Assumptions</h3>
          <div className="mt-3 grid gap-2 text-sm text-white/[0.78] sm:grid-cols-2">
            {assumptions.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CoachThinkingCard() {
  return (
    <div className="glass-card flex min-h-64 flex-col justify-center rounded-3xl border border-stone-400/45 bg-stone-100/80 p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-ink/70">AI Coach Is Thinking</p>
      <h2 className="mt-2 text-2xl font-black text-ink">Analyzing behavior patterns and financial risks...</h2>
      <p className="mt-3 text-sm text-ink/80">
        Generating deterministic plan, checking nudges, and preparing personalized coaching.
      </p>
      <div className="mt-4 flex gap-2">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-mint [animation-delay:-0.3s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-mint [animation-delay:-0.15s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-mint" />
      </div>
    </div>
  );
}
