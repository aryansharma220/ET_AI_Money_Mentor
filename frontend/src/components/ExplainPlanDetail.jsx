import { useState } from "react";

export default function ExplainPlanDetail({ explainPlan, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!explainPlan) {
    return null;
  }

  function handleCopyAudit() {
    const auditPayload = {
      generated_at: explainPlan.generated_at,
      assumptions: explainPlan.assumptions,
      steps: explainPlan.steps.map((step) => ({
        key: step.key,
        label: step.label,
        value: step.value,
        formula: step.formula,
        evidence: step.evidence,
      })),
      checks: explainPlan.checks,
    };
    const jsonString = JSON.stringify(auditPayload, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatReadableFormula(formula) {
    if (!formula) return "";

    const variableLabels = {
      equity_return: "equity return",
      debt_return: "debt return",
      liquid_return: "liquid return",
      target_amount: "target amount",
      monthly_sip: "monthly SIP",
      monthly_income: "monthly income",
      monthly_expenses: "monthly expenses",
      savings: "savings score",
      debt: "debt score",
      emergency: "emergency score",
      diversification: "diversification score",
      years: "years",
      r: "annual return",
    };

    let output = formula;
    Object.entries(variableLabels).forEach(([key, label]) => {
      output = output.replace(new RegExp(`\\b${key}\\b`, "g"), label);
    });

    return output
      .replace(/\*/g, " x ")
      .replace(/\//g, " / ")
      .replace(/\^/g, " ^ ")
      .replace(/\+/g, " + ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatEvidenceLabel(key) {
    return key
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const generatedAt = new Date(explainPlan.generated_at).toLocaleString("en-IN");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="finova-audit-shell max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-white">Explain Plan Audit</h2>
            <p className="mt-1 text-xs text-white/65">Generated: {generatedAt}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            Close
          </button>
        </div>

        {/* Assumptions Section */}
        <section className="mb-6">
          <h3 className="mb-3 text-lg font-bold text-white">Assumptions</h3>
          <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-4">
            {(explainPlan.assumptions || []).map((assumption, idx) => (
              <p key={idx} className="text-sm text-white/80">
                • {assumption}
              </p>
            ))}
          </div>
        </section>

        {/* Steps Section */}
        <section className="mb-6">
          <h3 className="mb-3 text-lg font-bold text-white">Calculation Steps</h3>
          <div className="space-y-3">
            {(explainPlan.steps || []).map((step) => (
              <div key={step.key} className="rounded-xl border border-white/15 bg-white/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{step.key}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{step.label}</p>
                    <p className="mt-2 text-lg text-white/90">{step.value}</p>
                    {step.formula ? (
                      <p className="mt-2 rounded-md border border-white/15 bg-black/20 px-2 py-1.5 font-mono text-xs leading-5 text-white/80">
                        Formula: {formatReadableFormula(step.formula)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {step.evidence && Object.keys(step.evidence).length > 0 ? (
                  <div className="mt-4 border-t border-white/15 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Evidence</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(step.evidence).map(([key, value]) => {
                        const displayValue =
                          typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(4)) : value;
                        return (
                          <div key={key} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                            <p className="text-xs text-white/60">{formatEvidenceLabel(key)}</p>
                            <p className="mt-0.5 font-mono text-sm font-semibold text-white">{displayValue}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Checks Section */}
        {explainPlan.checks && explainPlan.checks.length > 0 ? (
          <section className="mb-6">
            <h3 className="mb-3 text-lg font-bold text-white">Validation Checks</h3>
            <div className="space-y-2">
              {explainPlan.checks.map((check, idx) => {
                const isPass = check.toLowerCase().includes("pass") || check.toLowerCase().includes("check passed");
                const bgColor = isPass ? "bg-emerald-400/10 border-emerald-300/30" : "bg-amber-400/10 border-amber-300/30";
                const textColor = isPass ? "text-emerald-100" : "text-amber-100";
                return (
                  <div key={idx} className={`rounded-lg border ${bgColor} px-4 py-3`}>
                    <p className={`text-sm font-semibold ${textColor}`}>{check}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Copy Audit Button */}
        <button
          type="button"
          onClick={handleCopyAudit}
          className="w-full rounded-lg border border-white/30 bg-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/30"
        >
          {copied ? "✓ Copied to Clipboard" : "Copy Audit JSON"}
        </button>
      </div>
    </div>
  );
}
