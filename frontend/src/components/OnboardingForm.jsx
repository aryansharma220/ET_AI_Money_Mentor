import { useState } from "react";

const defaultForm = {
  monthly_income: "1,00,000",
  monthly_expenses: "55,000",
  current_savings: "2,50,000",
  debt_outstanding: "1,20,000",
  investment_horizon_years: "15",
  risk_appetite: "moderate",
  target_amount: "1,00,00,000",
};

function formatDigitsForDisplay(rawValue) {
  const digitsOnly = String(rawValue || "").replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return new Intl.NumberFormat("en-IN").format(Number(digitsOnly));
}

function parseDisplayNumber(value) {
  const digitsOnly = String(value || "").replace(/[^\d]/g, "");
  return digitsOnly ? Number(digitsOnly) : 0;
}

export default function OnboardingForm({ onSubmit, loading }) {
  const [form, setForm] = useState(defaultForm);

  function handleChange(event) {
    const { name, value } = event.target;
    const formattedFields = ["monthly_income", "monthly_expenses", "current_savings", "debt_outstanding", "target_amount"];
    setForm((prev) => ({
      ...prev,
      [name]: ["risk_appetite"].includes(name)
        ? value
        : formattedFields.includes(name)
          ? formatDigitsForDisplay(value)
          : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      monthly_income: parseDisplayNumber(form.monthly_income),
      monthly_expenses: parseDisplayNumber(form.monthly_expenses),
      current_savings: parseDisplayNumber(form.current_savings),
      debt_outstanding: parseDisplayNumber(form.debt_outstanding),
      investment_horizon_years: Number(form.investment_horizon_years),
      risk_appetite: form.risk_appetite,
      target_amount: parseDisplayNumber(form.target_amount),
    });
  }

  return (
    <form className="workspace-side-panel space-y-4" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-xl font-extrabold text-white">Finova Financial Snapshot</h2>
        <p className="text-sm text-white/75">Share your numbers to build your deterministic Finova strategy.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Monthly Income" name="monthly_income" value={form.monthly_income} onChange={handleChange} />
        <Input label="Monthly Expenses" name="monthly_expenses" value={form.monthly_expenses} onChange={handleChange} />
        <Input label="Current Savings" name="current_savings" value={form.current_savings} onChange={handleChange} />
        <Input label="Debt Outstanding" name="debt_outstanding" value={form.debt_outstanding} onChange={handleChange} />
        <Input
          label="Investment Horizon (Years)"
          name="investment_horizon_years"
          value={form.investment_horizon_years}
          onChange={handleChange}
          min={1}
          max={50}
        />
        <Input label="Target Amount" name="target_amount" value={form.target_amount} onChange={handleChange} />
      </div>

      <label className="block text-sm font-semibold text-white/90">
        Risk Appetite
        <select
          className="workspace-select"
          name="risk_appetite"
          value={form.risk_appetite}
          onChange={handleChange}
        >
          <option value="conservative">Conservative</option>
          <option value="moderate">Moderate</option>
          <option value="aggressive">Aggressive</option>
        </select>
      </label>

      <button
        disabled={loading}
        type="submit"
        className="workspace-btn-primary w-full px-4 py-3 text-sm"
      >
        {loading ? "Building Finova Plan..." : "Build Finova Plan"}
      </button>
    </form>
  );
}

function Input({ label, name, value, onChange, min = 0, max }) {
  const isFormattedAmount = ["monthly_income", "monthly_expenses", "current_savings", "debt_outstanding", "target_amount"].includes(name);
  return (
    <label className="block text-sm font-semibold text-white/90">
      {label}
      <input
        className="workspace-input"
        type={isFormattedAmount ? "text" : "number"}
        inputMode={isFormattedAmount ? "numeric" : undefined}
        name={name}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required
      />
    </label>
  );
}
