import { useEffect, useMemo, useRef, useState } from "react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function blankGoal(index = 1) {
  return {
    name: `Goal ${index}`,
    target_amount: 1_000_000,
    horizon_years: 5,
    priority: Math.min(5, index),
    depends_on_text: "",
    linked_to_text: "",
  };
}

export default function MultiGoalPlanner({ data, loading, error, onRun }) {
  const [monthlyIncome, setMonthlyIncome] = useState(100000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(60000);
  const [currentSavings, setCurrentSavings] = useState(200000);
  const [debtOutstanding, setDebtOutstanding] = useState(50000);
  const [riskAppetite, setRiskAppetite] = useState("moderate");
  const [maxMonthlySip, setMaxMonthlySip] = useState(20000);
  const [goals, setGoals] = useState([blankGoal(1), blankGoal(2)]);

  const canSubmit = goals.length > 0 && !loading;

  const payload = useMemo(
    () => ({
      monthly_income: Number(monthlyIncome),
      monthly_expenses: Number(monthlyExpenses),
      current_savings: Number(currentSavings),
      debt_outstanding: Number(debtOutstanding),
      risk_appetite: riskAppetite,
      max_monthly_sip: Number(maxMonthlySip),
      goals: goals.map((goal) => ({
        name: goal.name,
        target_amount: Number(goal.target_amount),
        horizon_years: Number(goal.horizon_years),
        priority: Number(goal.priority),
        depends_on: splitNames(goal.depends_on_text),
        linked_to: splitNames(goal.linked_to_text),
      })),
    }),
    [monthlyIncome, monthlyExpenses, currentSavings, debtOutstanding, riskAppetite, maxMonthlySip, goals],
  );

  function splitNames(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function updateGoal(index, key, value) {
    setGoals((prev) =>
      prev.map((goal, idx) => {
        if (idx !== index) {
          return goal;
        }
        return { ...goal, [key]: value };
      }),
    );
  }

  function addGoal() {
    setGoals((prev) => [...prev, blankGoal(prev.length + 1)]);
  }

  function removeGoal(index) {
    setGoals((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleRun() {
    if (!canSubmit) {
      return;
    }
    onRun(payload);
  }

  return (
    <section className="workspace-side-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-white">Multi-Goal Optimization Engine</h3>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/[0.78]">Constrained Allocation Engine</p>
      </div>
      <p className="text-sm text-white/75">
        We allocate your money across competing goals under real-world constraints.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm font-semibold text-white/90">
          Monthly Income
          <input
            type="number"
            value={monthlyIncome}
            onChange={(event) => setMonthlyIncome(Number(event.target.value))}
            className="workspace-input"
          />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Monthly Expenses
          <input
            type="number"
            value={monthlyExpenses}
            onChange={(event) => setMonthlyExpenses(Number(event.target.value))}
            className="workspace-input"
          />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Max Monthly SIP
          <input
            type="number"
            value={maxMonthlySip}
            onChange={(event) => setMaxMonthlySip(Number(event.target.value))}
            className="workspace-input"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm font-semibold text-white/90">
          Current Savings
          <input
            type="number"
            value={currentSavings}
            onChange={(event) => setCurrentSavings(Number(event.target.value))}
            className="workspace-input"
          />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Debt Outstanding
          <input
            type="number"
            value={debtOutstanding}
            onChange={(event) => setDebtOutstanding(Number(event.target.value))}
            className="workspace-input"
          />
        </label>
        <label className="block text-sm font-semibold text-white/90">
          Risk Appetite
          <select
            value={riskAppetite}
            onChange={(event) => setRiskAppetite(event.target.value)}
            className="workspace-select"
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {goals.map((goal, index) => (
          <div key={`${goal.name}-${index}`} className="workspace-note p-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm font-semibold text-white/90">
                Goal Name
                <input
                  type="text"
                  value={goal.name}
                  onChange={(event) => updateGoal(index, "name", event.target.value)}
                  className="workspace-input"
                />
              </label>
              <label className="block text-sm font-semibold text-white/90">
                Target Amount
                <input
                  type="number"
                  value={goal.target_amount}
                  onChange={(event) => updateGoal(index, "target_amount", Number(event.target.value))}
                  className="workspace-input"
                />
              </label>
              <label className="block text-sm font-semibold text-white/90">
                Horizon (Years)
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={goal.horizon_years}
                  onChange={(event) => updateGoal(index, "horizon_years", Number(event.target.value))}
                  className="workspace-input"
                />
              </label>
              <label className="block text-sm font-semibold text-white/90">
                Priority (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={goal.priority}
                  onChange={(event) => updateGoal(index, "priority", Number(event.target.value))}
                  className="workspace-input"
                />
              </label>
              <label className="block text-sm font-semibold text-white/90 md:col-span-2 lg:col-span-1">
                Depends On (comma separated goal names)
                <input
                  type="text"
                  value={goal.depends_on_text}
                  onChange={(event) => updateGoal(index, "depends_on_text", event.target.value)}
                  placeholder="Emergency Fund"
                  className="workspace-input"
                />
              </label>
              <label className="block text-sm font-semibold text-white/90 md:col-span-2 lg:col-span-1">
                Linked Goals (comma separated)
                <input
                  type="text"
                  value={goal.linked_to_text}
                  onChange={(event) => updateGoal(index, "linked_to_text", event.target.value)}
                  placeholder="Retirement"
                  className="workspace-input"
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => removeGoal(index)}
                disabled={goals.length <= 1}
                className="workspace-btn-secondary px-3 py-1.5 text-xs"
              >
                Remove Goal
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addGoal}
          className="workspace-btn-secondary px-4 py-2 text-sm"
        >
          Add Goal
        </button>
        <button
          type="button"
          onClick={handleRun}
          disabled={!canSubmit}
          className="workspace-btn-primary px-4 py-2 text-sm"
        >
          {loading ? "Running Optimizer..." : "Run Multi-Goal Plan"}
        </button>
      </div>

      {error ? <p className="rounded-xl border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

      {data ? <MultiGoalResults data={data} /> : null}
    </section>
  );
}

function MultiGoalResults({ data }) {
  const criticalPath = useMemo(() => buildCriticalPath(data.goals, data.goal_graph), [data.goals, data.goal_graph]);

  return (
    <div className="space-y-3 rounded-2xl border border-white/18 bg-white/8 p-4">
      <div className="grid gap-2 md:grid-cols-3">
        <Metric label="Capacity" value={formatCurrency(data.total_capacity)} />
        <Metric label="Required" value={formatCurrency(data.total_required)} />
        <Metric label="Allocated" value={formatCurrency(data.total_allocated)} />
      </div>

      <div className="workspace-side-panel-rail panel-accent panel-accent-cyan rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white/[0.82]">
        Asset Mix: Equity {data.allocation.equity}% · Debt {data.allocation.debt}% · Liquid {data.allocation.liquid}%
      </div>

      <div className="space-y-2">
        {data.goals.map((goal) => (
          <div key={goal.name} className="rounded-xl border border-white/15 bg-white/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-white">{goal.name}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(goal.status)}`}>{goal.status.replace("_", " ")}</span>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm text-white/80">
              <p>Required SIP: <span className="font-semibold text-white">{formatCurrency(goal.required_monthly_sip)}</span></p>
              <p>Allocated SIP: <span className="font-semibold text-white">{formatCurrency(goal.allocated_monthly_sip)}</span></p>
              <p>Shortfall: <span className="font-semibold text-white">{formatCurrency(goal.shortfall_monthly_sip)}</span></p>
              <p>Projected Corpus: <span className="font-semibold text-white">{formatCurrency(goal.projected_corpus)}</span></p>
            </div>

            {goal.status !== "fully_funded" ? (
              <div className="mt-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/75">
                Delay by 1 year simulation: required SIP becomes {formatCurrency(goal.delay_by_one_year_required_sip)}
                ({goal.delay_by_one_year_sip_change < 0 ? " " : " +"}
                {formatCurrency(goal.delay_by_one_year_sip_change)} change/month).
              </div>
            ) : null}

            {(goal.depends_on?.length || goal.linked_to?.length) ? (
              <div className="mt-2 text-xs text-white/[0.78]">
                {goal.depends_on?.length ? <p>Depends on: {goal.depends_on.join(", ")}</p> : null}
                {goal.linked_to?.length ? <p>Linked to: {goal.linked_to.join(", ")}</p> : null}
                {goal.is_blocked ? <p className="text-rose-300">Blocked by: {goal.blocking_goals.join(", ")}</p> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {data.insights?.length ? (
        <div className="workspace-side-panel-rail panel-accent panel-accent-amber rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/[0.78]">Insights</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-white/85">
            {data.insights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.recommendations?.length ? (
        <div className="workspace-side-panel-rail panel-accent panel-accent-mint rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/[0.78]">Recommendations</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-white/85">
            {data.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.goal_graph?.nodes?.length ? (
        <div className="workspace-side-panel-hero panel-accent panel-accent-cyan rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/[0.78]">Goal Dependency Graph</p>
          <p className="mt-1 text-xs text-white/[0.78]">
            Dependency rule: a dependent goal should be funded only after its required predecessor goals are resolved.
          </p>
          <GoalDependencyGraph goals={data.goals} graph={data.goal_graph} />
        </div>
      ) : null}

      {criticalPath.length ? (
        <div className="workspace-side-panel-rail panel-accent panel-accent-ice rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/[0.78]">Critical Path View</p>
          <p className="mt-1 text-xs text-white/[0.78]">Resolve these blocked goals first to unlock maximum downstream progress.</p>
          <div className="mt-2 space-y-2">
            {criticalPath.map((item) => (
              <div key={item.goal} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm">
                <p className="font-semibold text-white">{item.goal}</p>
                <p className="text-white/80">
                  Unlocks {item.downstreamCount} downstream goal(s) · Potential shortfall relief {formatCurrency(item.downstreamShortfall)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GoalDependencyGraph({ goals, graph }) {
  const width = 860;
  const height = 240;
  const nodeWidth = 170;
  const nodeHeight = 58;
  const laneY = height / 2 - nodeHeight / 2;
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragNode, setDragNode] = useState(null);
  const [manualPositions, setManualPositions] = useState({});
  const graphStorageKey = useMemo(() => {
    const nodePart = [...(graph.nodes || [])].sort().join("|");
    const edgePart = [...(graph.edges || [])]
      .map((edge) => `${edge.source}->${edge.target}:${edge.relation}`)
      .sort()
      .join("|");
    return `aimm_goal_graph_layout_v1:${nodePart}::${edgePart}`;
  }, [graph.edges, graph.nodes]);

  const statusMap = new Map(goals.map((goal) => [goal.name, goal.status]));
  const blockedMap = new Map(goals.map((goal) => [goal.name, goal.is_blocked]));

  const orderedNodes = [...graph.nodes].sort((a, b) => {
    const aGoal = goals.find((goal) => goal.name === a);
    const bGoal = goals.find((goal) => goal.name === b);
    if (!aGoal || !bGoal) {
      return a.localeCompare(b);
    }
    if (aGoal.priority !== bGoal.priority) {
      return aGoal.priority - bGoal.priority;
    }
    return aGoal.horizon_years - bGoal.horizon_years;
  });

  const spacing = orderedNodes.length > 1 ? (width - nodeWidth) / (orderedNodes.length - 1) : 0;
  const basePositions = new Map(
    orderedNodes.map((name, index) => [
      name,
      {
        x: orderedNodes.length === 1 ? width / 2 - nodeWidth / 2 : index * spacing,
        y: laneY,
      },
    ]),
  );

  const positions = new Map(
    orderedNodes.map((name) => {
      const manual = manualPositions[name];
      const base = basePositions.get(name);
      return [name, manual || base];
    }),
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(graphStorageKey);
      if (!raw) {
        setManualPositions({});
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        setManualPositions({});
        return;
      }

      const validNames = new Set(graph.nodes || []);
      const sanitized = {};
      Object.entries(parsed).forEach(([name, pos]) => {
        if (!validNames.has(name)) {
          return;
        }
        if (
          pos &&
          typeof pos === "object" &&
          typeof pos.x === "number" &&
          typeof pos.y === "number"
        ) {
          sanitized[name] = {
            x: Math.max(8, Math.min(width - nodeWidth - 8, pos.x)),
            y: Math.max(8, Math.min(height - nodeHeight - 8, pos.y)),
          };
        }
      });

      setManualPositions(sanitized);
    } catch {
      setManualPositions({});
    }
  }, [graph.nodes, graphStorageKey]);

  useEffect(() => {
    try {
      if (!Object.keys(manualPositions).length) {
        window.localStorage.removeItem(graphStorageKey);
        return;
      }
      window.localStorage.setItem(graphStorageKey, JSON.stringify(manualPositions));
    } catch {
      // Ignore storage failures (private mode/quota) without breaking interaction.
    }
  }, [graphStorageKey, manualPositions]);

  const highlighted = useMemo(() => {
    if (!selectedNode) {
      return { nodes: new Set(), edges: new Set() };
    }

    const nodeSet = new Set([selectedNode]);
    const edgeSet = new Set();
    const queue = [selectedNode];

    while (queue.length) {
      const current = queue.shift();
      graph.edges.forEach((edge, idx) => {
        const key = `${edge.source}-${edge.target}-${edge.relation}-${idx}`;
        if (edge.source === current || edge.target === current) {
          edgeSet.add(key);
          if (!nodeSet.has(edge.source)) {
            nodeSet.add(edge.source);
            queue.push(edge.source);
          }
          if (!nodeSet.has(edge.target)) {
            nodeSet.add(edge.target);
            queue.push(edge.target);
          }
        }
      });
    }

    return { nodes: nodeSet, edges: edgeSet };
  }, [selectedNode, graph.edges]);

  function getSvgPoint(event) {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function handleNodeMouseDown(event, nodeName) {
    event.preventDefault();
    setSelectedNode(nodeName);
    setDragNode(nodeName);
  }

  function handleMouseMove(event) {
    if (!dragNode) {
      return;
    }
    const point = getSvgPoint(event);
    if (!point) {
      return;
    }

    const clampedX = Math.max(8, Math.min(width - nodeWidth - 8, point.x - nodeWidth / 2));
    const clampedY = Math.max(8, Math.min(height - nodeHeight - 8, point.y - nodeHeight / 2));

    setManualPositions((prev) => ({
      ...prev,
      [dragNode]: { x: clampedX, y: clampedY },
    }));
  }

  function handleMouseUp() {
    setDragNode(null);
  }

  function handleResetLayout() {
    setManualPositions({});
    setSelectedNode(null);
    try {
      window.localStorage.removeItem(graphStorageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-[240px] min-w-[860px] rounded-xl border border-white/15 bg-[#0f2745]/85"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 z" fill="#c9d9ec" />
          </marker>
          <marker id="linkDot" markerWidth="6" markerHeight="6" refX="3" refY="3">
            <circle cx="3" cy="3" r="2" fill="#8ad7c8" />
          </marker>
        </defs>

        {graph.edges.map((edge, idx) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) {
            return null;
          }

          const edgeKey = `${edge.source}-${edge.target}-${edge.relation}-${idx}`;
          const selectedMode = Boolean(selectedNode);
          const edgeActive = highlighted.edges.has(edgeKey);

          const sourceX = source.x + nodeWidth;
          const sourceY = source.y + nodeHeight / 2;
          const targetX = target.x;
          const targetY = target.y + nodeHeight / 2;
          const distance = Math.abs(targetX - sourceX);
          const curve = Math.max(28, Math.min(90, distance * 0.3));
          const isForward = targetX >= sourceX;

          const path = `M ${sourceX} ${sourceY} C ${sourceX + (isForward ? curve : -curve)} ${sourceY}, ${targetX - (isForward ? curve : -curve)} ${targetY}, ${targetX} ${targetY}`;
          const stroke = edge.relation === "depends_on" ? "#c9d9ec" : "#8ad7c8";
          const dash = edge.relation === "depends_on" ? "0" : "6 4";

          return (
            <g key={`${edge.source}-${edge.target}-${edge.relation}-${idx}`}>
              <path
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={edgeActive ? "2.5" : "1.8"}
                strokeDasharray={dash}
                markerEnd={edge.relation === "depends_on" ? "url(#arrow)" : "url(#linkDot)"}
                opacity={selectedMode ? (edgeActive ? 0.95 : 0.22) : 0.9}
              />
            </g>
          );
        })}

        {orderedNodes.map((name) => {
          const pos = positions.get(name);
          if (!pos) {
            return null;
          }
          const status = statusMap.get(name) || "unfunded";
          const blocked = blockedMap.get(name) || false;

          const tone =
            status === "fully_funded"
              ? { fill: "#d7e7d6", stroke: "#4b6a48", text: "#2b3d28" }
              : status === "partially_funded"
                ? { fill: "#eadfce", stroke: "#8a6f49", text: "#4d3d28" }
                : { fill: "#ead3d3", stroke: "#8f5656", text: "#4f2f2f" };

          const selectedMode = Boolean(selectedNode);
          const nodeActive = highlighted.nodes.has(name);

          return (
            <g key={name} onMouseDown={(event) => handleNodeMouseDown(event, name)} style={{ cursor: "grab" }}>
              <rect
                x={pos.x}
                y={pos.y}
                rx="10"
                ry="10"
                width={nodeWidth}
                height={nodeHeight}
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth={blocked ? "2.6" : "1.5"}
                opacity={selectedMode ? (nodeActive ? 1 : 0.35) : 1}
              />
              <text
                x={pos.x + nodeWidth / 2}
                y={pos.y + 25}
                textAnchor="middle"
                className="fill-current text-[12px] font-semibold"
                style={{ color: tone.text, opacity: selectedMode ? (nodeActive ? 1 : 0.45) : 1 }}
              >
                {name.length > 22 ? `${name.slice(0, 22)}...` : name}
              </text>
              <text
                x={pos.x + nodeWidth / 2}
                y={pos.y + 44}
                textAnchor="middle"
                className="fill-current text-[11px]"
                style={{ color: tone.text, opacity: selectedMode ? (nodeActive ? 0.85 : 0.35) : 0.85 }}
              >
                {blocked ? "Blocked" : status.replace("_", " ")}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-white/[0.78]">Click a node to highlight its dependency chain. Drag nodes to reorganize the graph.</p>
        <button
          type="button"
          onClick={handleResetLayout}
          className="workspace-btn-secondary px-2.5 py-1 text-[11px]"
        >
          Reset Layout
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/75">
        <p><span className="font-semibold">Solid Arrow:</span> Depends On</p>
        <p><span className="font-semibold">Dashed Link:</span> Linked Goal</p>
        <p><span className="font-semibold">Thick Border:</span> Blocked Goal</p>
      </div>
    </div>
  );
}

function buildCriticalPath(goals, graph) {
  if (!goals?.length || !graph?.edges?.length) {
    return [];
  }

  const blockedGoals = goals.filter((goal) => goal.is_blocked);
  if (!blockedGoals.length) {
    return [];
  }

  const dependentMap = new Map();
  graph.edges
    .filter((edge) => edge.relation === "depends_on")
    .forEach((edge) => {
      if (!dependentMap.has(edge.target)) {
        dependentMap.set(edge.target, new Set());
      }
      dependentMap.get(edge.target).add(edge.source);
    });

  const goalByName = new Map(goals.map((goal) => [goal.name, goal]));
  const blockerNames = new Set(blockedGoals.flatMap((goal) => goal.blocking_goals || []));

  function collectDownstream(start) {
    const visited = new Set();
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      const children = dependentMap.get(current);
      if (!children) {
        continue;
      }
      children.forEach((name) => {
        if (!visited.has(name)) {
          visited.add(name);
          queue.push(name);
        }
      });
    }
    return visited;
  }

  return [...blockerNames]
    .map((goalName) => {
      const downstream = collectDownstream(goalName);
      const downstreamShortfall = [...downstream].reduce((acc, dependentName) => {
        const g = goalByName.get(dependentName);
        return acc + (g ? g.shortfall_monthly_sip : 0);
      }, 0);

      return {
        goal: goalName,
        downstreamCount: downstream.size,
        downstreamShortfall,
      };
    })
    .sort((a, b) => {
      if (b.downstreamCount !== a.downstreamCount) {
        return b.downstreamCount - a.downstreamCount;
      }
      return b.downstreamShortfall - a.downstreamShortfall;
    });
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/65">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function statusTone(status) {
  if (status === "fully_funded") {
    return "border border-emerald-300/40 bg-emerald-500/20 text-emerald-100";
  }
  if (status === "partially_funded") {
    return "border border-amber-300/40 bg-amber-500/22 text-amber-100";
  }
  return "border border-rose-300/40 bg-rose-500/22 text-rose-100";
}
