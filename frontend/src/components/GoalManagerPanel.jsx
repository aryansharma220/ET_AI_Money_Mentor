import { useEffect, useState } from "react";

import { archiveGoal, createGoal, listGoals, updateGoal } from "../services/api";

const initialForm = {
  name: "",
  target_amount: "",
  horizon_years: "5",
  priority: "3",
  current_progress_amount: "0",
  monthly_contribution: "0",
  depends_on_goal_ids: [],
  linked_to_goal_ids: [],
};

const statusOptions = ["active", "paused", "completed", "archived"];

function statusChipClass(status) {
  if (status === "completed") return "bg-emerald-500/20 text-emerald-100 border-emerald-300/40";
  if (status === "paused") return "bg-amber-500/20 text-amber-100 border-amber-300/40";
  if (status === "archived") return "bg-slate-500/20 text-slate-100 border-slate-300/40";
  return "bg-sky-500/20 text-sky-100 border-sky-300/40";
}

function formatDigitsForDisplay(rawValue) {
  const digitsOnly = String(rawValue || "").replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return new Intl.NumberFormat("en-IN").format(Number(digitsOnly));
}

function parseDisplayNumber(value) {
  const digitsOnly = String(value || "").replace(/[^\d]/g, "");
  return digitsOnly ? Number(digitsOnly) : 0;
}

function handleFormattedAmountInput(setter) {
  return (event) => {
    setter(formatDigitsForDisplay(event.target.value));
  };
}

export default function GoalManagerPanel({ token }) {
  const [form, setForm] = useState(initialForm);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  async function loadGoals(nextIncludeArchived = includeArchived) {
    if (!token) {
      setGoals([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await listGoals(token, nextIncludeArchived);
      setGoals(response);
    } catch (err) {
      setError(err.message || "Unable to load goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals(includeArchived);
  }, [token, includeArchived]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreateGoal(event) {
    event.preventDefault();
    if (!token) {
      setMessage("Sign in to manage Finova goals.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await createGoal(
        {
          name: form.name.trim(),
          target_amount: parseDisplayNumber(form.target_amount),
          horizon_years: Number(form.horizon_years),
          priority: Number(form.priority),
          current_progress_amount: parseDisplayNumber(form.current_progress_amount),
          monthly_contribution: parseDisplayNumber(form.monthly_contribution),
          depends_on_goal_ids: form.depends_on_goal_ids,
          linked_to_goal_ids: form.linked_to_goal_ids,
          status: "active",
        },
        token,
      );
      setForm(initialForm);
      setMessage("Goal created.");
      await loadGoals(includeArchived);
    } catch (err) {
      setError(err.message || "Unable to create goal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleInlineUpdate(goalId, payload) {
    if (!token) return;

    setError("");
    try {
      await updateGoal(goalId, payload, token);
      await loadGoals(includeArchived);
    } catch (err) {
      setError(err.message || "Unable to update goal.");
    }
  }

  async function handleArchive(goalId) {
    if (!token) return;

    setError("");
    try {
      await archiveGoal(goalId, token);
      await loadGoals(includeArchived);
    } catch (err) {
      setError(err.message || "Unable to archive goal.");
    }
  }

  return (
    <div className="workspace-side-panel workspace-side-panel-rail panel-accent panel-accent-lavender">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/65">Goal Lifecycle</p>
          <h3 className="mt-1 text-lg font-bold text-white">Finova Goal Manager</h3>
          <p className="mt-1 text-sm text-white/80">Create, track, and archive personal goals inside Finova Vault.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/80">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            className="h-4 w-4 rounded border-white/40 bg-white/20"
          />
          Include archived
        </label>
      </div>

      <form onSubmit={handleCreateGoal} className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-white/80 sm:col-span-2">
          <p className="mb-1 font-semibold text-white/90">Goal Name</p>
          <input
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
            placeholder="Goal name"
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55"
            required
          />
        </label>
        <label className="text-xs text-white/80">
          <p className="mb-1 font-semibold text-white/90">Target Amount</p>
          <input
            type="text"
            inputMode="numeric"
            value={form.target_amount}
            onChange={(event) => handleChange("target_amount", formatDigitsForDisplay(event.target.value))}
            placeholder="Target amount"
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55"
            required
          />
        </label>
        <label className="text-xs text-white/80">
          <p className="mb-1 font-semibold text-white/90">Horizon (Years)</p>
          <input
            type="number"
            min="1"
            max="50"
            value={form.horizon_years}
            onChange={(event) => handleChange("horizon_years", event.target.value)}
            placeholder="Horizon years"
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55"
            required
          />
        </label>
        <label className="text-xs text-white/80">
          <p className="mb-1 font-semibold text-white/90">Priority (1-5)</p>
          <input
            type="number"
            min="1"
            max="5"
            value={form.priority}
            onChange={(event) => handleChange("priority", event.target.value)}
            placeholder="Priority"
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55"
            required
          />
        </label>
        <label className="text-xs text-white/80">
          <p className="mb-1 font-semibold text-white/90">Current Progress Amount</p>
          <input
            type="text"
            inputMode="numeric"
            value={form.current_progress_amount}
            onChange={(event) => handleChange("current_progress_amount", formatDigitsForDisplay(event.target.value))}
            placeholder="Current progress"
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55"
          />
        </label>
        <label className="text-xs text-white/80">
          <p className="mb-1 font-semibold text-white/90">Monthly Contribution</p>
          <input
            type="text"
            inputMode="numeric"
            value={form.monthly_contribution}
            onChange={(event) => handleChange("monthly_contribution", formatDigitsForDisplay(event.target.value))}
            placeholder="Monthly contribution"
            className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55"
          />
        </label>
        <RelationPicker
          label="Depends On Goals"
          options={goals}
          selectedIds={form.depends_on_goal_ids}
          onChange={(nextIds) => handleChange("depends_on_goal_ids", nextIds)}
        />
        <RelationPicker
          label="Linked Goals"
          options={goals}
          selectedIds={form.linked_to_goal_ids}
          onChange={(nextIds) => handleChange("linked_to_goal_ids", nextIds)}
        />
        <button
          type="submit"
          disabled={!token || saving}
          className="rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          {saving ? "Creating in Finova..." : "Create Finova Goal"}
        </button>
      </form>

      {message ? <p className="mt-3 text-xs font-semibold text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-3 text-xs font-semibold text-rose-200">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-white/80">Loading goals...</p> : null}
        {!loading && goals.length === 0 ? <p className="text-sm text-white/75">No goals yet.</p> : null}

        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} goals={goals} onUpdate={handleInlineUpdate} onArchive={handleArchive} token={token} />
        ))}
      </div>
    </div>
  );
}

function GoalRow({ goal, goals, onUpdate, onArchive, token }) {
  const [progress, setProgress] = useState(formatDigitsForDisplay(goal.current_progress_amount ?? 0));
  const [monthlyContribution, setMonthlyContribution] = useState(formatDigitsForDisplay(goal.monthly_contribution ?? 0));
  const [status, setStatus] = useState(goal.status || "active");
  const [dependsOnGoalIds, setDependsOnGoalIds] = useState(goal.depends_on_goal_ids || []);
  const [linkedToGoalIds, setLinkedToGoalIds] = useState(goal.linked_to_goal_ids || []);

  const goalNameById = Object.fromEntries(goals.map((item) => [item.id, item.name]));
  const availableRelations = goals.filter((item) => item.id !== goal.id);

  useEffect(() => {
    setProgress(formatDigitsForDisplay(goal.current_progress_amount ?? 0));
    setMonthlyContribution(formatDigitsForDisplay(goal.monthly_contribution ?? 0));
    setStatus(goal.status || "active");
    setDependsOnGoalIds(goal.depends_on_goal_ids || []);
    setLinkedToGoalIds(goal.linked_to_goal_ids || []);
  }, [goal.current_progress_amount, goal.monthly_contribution, goal.status, goal.depends_on_goal_ids, goal.linked_to_goal_ids]);

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{goal.name}</p>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusChipClass(goal.status)}`}>
          {goal.status}
        </span>
      </div>

      <p className="mt-1 text-xs text-white/75">
        Target: {Number(goal.target_amount).toLocaleString("en-IN")} | Horizon: {goal.horizon_years}y | Priority: {goal.priority}
      </p>
      <p className="mt-1 text-xs text-white/80">Progress: {goal.progress_percent}%</p>
      {goal.blocked_by_goal_ids?.length ? (
        <p className="mt-1 text-xs font-semibold text-amber-200">
          Blocked by goals: {goal.blocked_by_goal_ids.map((id) => `${goalNameById[id] || "Goal"} (#${id})`).join(", ")}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-white/75">
          <p className="mb-1 font-semibold text-white/90">Progress Amount</p>
          <input
            type="text"
            inputMode="numeric"
            value={progress}
            onChange={handleFormattedAmountInput(setProgress)}
            className="w-full rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-xs text-white"
            placeholder="Progress"
          />
        </label>
        <label className="text-[11px] text-white/75">
          <p className="mb-1 font-semibold text-white/90">Monthly Contribution</p>
          <input
            type="text"
            inputMode="numeric"
            value={monthlyContribution}
            onChange={handleFormattedAmountInput(setMonthlyContribution)}
            className="w-full rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-xs text-white"
            placeholder="Monthly"
          />
        </label>
        <label className="text-[11px] text-white/75">
          <p className="mb-1 font-semibold text-white/90">Status</p>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-xs text-white"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option} className="text-slate-900">
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <RelationPicker
          label="Depends On Goals"
          options={availableRelations}
          selectedIds={dependsOnGoalIds}
          onChange={setDependsOnGoalIds}
        />
        <RelationPicker
          label="Linked Goals"
          options={availableRelations}
          selectedIds={linkedToGoalIds}
          onChange={setLinkedToGoalIds}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!token}
          onClick={() =>
            onUpdate(goal.id, {
              current_progress_amount: parseDisplayNumber(progress),
              monthly_contribution: parseDisplayNumber(monthlyContribution),
              status,
              depends_on_goal_ids: dependsOnGoalIds,
              linked_to_goal_ids: linkedToGoalIds,
            })
          }
          className="rounded-lg border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Update
        </button>
        {goal.status !== "archived" ? (
          <button
            type="button"
            disabled={!token}
            onClick={() => onArchive(goal.id)}
            className="rounded-lg border border-rose-300/40 bg-rose-400/20 px-2.5 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Archive
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RelationPicker({ label, options, selectedIds, onChange }) {
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const selectedIdSet = new Set(selectedIds);
  const visibleOptions = options.filter((item) => includeArchived || item.status !== "archived");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = visibleOptions.filter((item) => {
    if (selectedIdSet.has(item.id)) return false;
    if (!normalizedQuery) return true;
    return item.name.toLowerCase().includes(normalizedQuery) || String(item.id).includes(normalizedQuery);
  });
  const selectedGoals = selectedIds.map((id) => options.find((item) => item.id === id)).filter(Boolean);

  function addGoal(goalId) {
    if (selectedIdSet.has(goalId)) return;
    onChange([...selectedIds, goalId]);
    setQuery("");
  }

  function removeGoal(goalId) {
    onChange(selectedIds.filter((id) => id !== goalId));
  }

  return (
    <div className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs text-white/80">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-white/90">{label}</p>
        <label className="flex items-center gap-1.5 text-[11px] text-white/70">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/40 bg-white/20"
          />
          Include archived
        </label>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {selectedGoals.length ? (
          selectedGoals.map((goal) => (
            <span
              key={`chip-${label}-${goal.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-sky-300/40 bg-sky-500/20 px-2 py-0.5 text-[11px] font-semibold text-sky-100"
            >
              {goal.name} (#{goal.id})
              <button
                type="button"
                onClick={() => removeGoal(goal.id)}
                className="rounded-full border border-sky-200/40 px-1 leading-none text-[10px] text-sky-100 hover:bg-sky-200/20"
                aria-label={`Remove ${goal.name}`}
              >
                x
              </button>
            </span>
          ))
        ) : (
          <p className="text-[11px] text-white/60">No goals selected</p>
        )}
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by goal name or ID"
        className="mb-2 w-full rounded-md border border-white/20 bg-black/25 px-2 py-1.5 text-xs text-white placeholder:text-white/45"
      />

      <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-white/15 bg-black/20 p-1.5">
        {filteredOptions.length ? (
          filteredOptions.map((item) => (
            <button
              key={`option-${label}-${item.id}`}
              type="button"
              onClick={() => addGoal(item.id)}
              className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1 text-left text-[11px] text-white/90 hover:bg-white/10"
            >
              <span>{item.name}</span>
              <span className="text-white/60">#{item.id}</span>
            </button>
          ))
        ) : (
          <p className="px-1 py-1 text-[11px] text-white/55">No matching goals available</p>
        )}
      </div>
    </div>
  );
}
