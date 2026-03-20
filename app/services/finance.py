"""Deterministic finance calculations for AI Money Mentor.

All functions in this module are pure and deterministic. They do not call
external services and are safe to unit test.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from app.core.config import settings
from app.models import (
    Allocation,
    ExplainPlan,
    ExplainPlanStep,
    GoalGraphEdge,
    GoalGraphMetadata,
    GoalPlanData,
    MoneyHealthScore,
    MoneyHealthScoreBreakdown,
    MultiGoalPlanRequest,
    MultiGoalPlanResponse,
    PlanData,
    PlanRequest,
    ProjectionPoint,
    RiskAppetite,
)


def _round2(value: float) -> float:
    return round(value, 2)


def required_monthly_sip(target_amount: float, return_rate: float, years: int) -> float:
    """Calculate monthly SIP needed to reach a target with monthly compounding.

    Args:
        target_amount: Target corpus to be achieved at the end of the period.
        return_rate: Annual expected return as decimal (e.g., 0.12 for 12%).
        years: Investment duration in years.

    Returns:
        Required monthly SIP amount.
    """

    months = years * 12
    monthly_rate = return_rate / 12
    if months <= 0:
        raise ValueError("years must be positive")
    if monthly_rate == 0:
        return _round2(target_amount / months)

    # SIP future-value factor for contributions made at month-end.
    factor = ((1 + monthly_rate) ** months - 1) / monthly_rate
    sip = target_amount / factor
    return _round2(sip)


def future_value(monthly_sip: float, return_rate: float, years: int) -> float:
    """Compute future value for monthly SIP with monthly compounding.

    Args:
        monthly_sip: Fixed monthly investment amount.
        return_rate: Annual expected return as decimal.
        years: Investment horizon in years.

    Returns:
        Future value of the SIP corpus.
    """

    months = years * 12
    monthly_rate = return_rate / 12
    if months <= 0:
        raise ValueError("years must be positive")
    if monthly_rate == 0:
        return _round2(monthly_sip * months)

    fv = monthly_sip * (((1 + monthly_rate) ** months - 1) / monthly_rate)
    return _round2(fv)


def generate_projection_series(monthly_sip: float, return_rate: float, years: int) -> list[ProjectionPoint]:
    """Generate annual projection series for charting and dashboard reporting.

    Args:
        monthly_sip: Fixed monthly SIP amount.
        return_rate: Annual expected return as decimal.
        years: Projection range in years.

    Returns:
        List of annual projection points containing invested and projected corpus.
    """

    if years <= 0:
        raise ValueError("years must be positive")

    projection: list[ProjectionPoint] = []
    for year in range(1, years + 1):
        invested = monthly_sip * 12 * year
        value = future_value(monthly_sip=monthly_sip, return_rate=return_rate, years=year)
        projection.append(
            ProjectionPoint(
                year=year,
                invested_amount=_round2(invested),
                projected_value=_round2(value),
            )
        )
    return projection


def risk_to_allocation(risk_appetite: RiskAppetite) -> Allocation:
    """Map fixed risk appetite buckets to strategic allocation."""

    mapping = {
        RiskAppetite.conservative: Allocation(equity=40, debt=45, liquid=15),
        RiskAppetite.moderate: Allocation(equity=65, debt=25, liquid=10),
        RiskAppetite.aggressive: Allocation(equity=80, debt=15, liquid=5),
    }
    return mapping[risk_appetite]


def weighted_expected_return(allocation: Allocation) -> float:
    """Compute weighted annual return from configurable asset assumptions."""

    weighted = (
        (allocation.equity / 100) * settings.equity_return_annual
        + (allocation.debt / 100) * settings.debt_return_annual
        + (allocation.liquid / 100) * settings.liquid_return_annual
    )
    return round(weighted, 4)


def _clamp_score(value: float) -> int:
    return max(0, min(100, int(round(value))))


def compute_money_health_score(plan_input: PlanRequest, allocation: Allocation) -> MoneyHealthScore:
    """Calculate a 0-100 Money Health Score from deterministic sub-metrics."""

    income = plan_input.monthly_income
    expenses = plan_input.monthly_expenses

    savings_ratio = (income - expenses) / income
    savings_score = _clamp_score((savings_ratio / 0.35) * 100)

    debt_to_income = plan_input.debt_outstanding / (income * 12)
    debt_score = _clamp_score(100 - (debt_to_income / 0.5) * 100)

    emergency_months = plan_input.current_savings / expenses if expenses > 0 else 0
    emergency_score = _clamp_score((emergency_months / 6) * 100)

    allocation_non_zero = sum(1 for x in [allocation.equity, allocation.debt, allocation.liquid] if x > 0)
    diversification_score = {1: 35, 2: 70, 3: 100}[allocation_non_zero]

    overall = _clamp_score(
        savings_score * 0.35
        + debt_score * 0.25
        + emergency_score * 0.25
        + diversification_score * 0.15
    )

    return MoneyHealthScore(
        overall=overall,
        components=MoneyHealthScoreBreakdown(
            savings_ratio=savings_score,
            debt_ratio=debt_score,
            emergency_fund=emergency_score,
            diversification=diversification_score,
        ),
    )


def build_priority_actions(plan_input: PlanRequest, score: MoneyHealthScore) -> list[str]:
    """Generate actionable deterministic recommendations from thresholds."""

    actions: list[str] = []
    savings_ratio = (plan_input.monthly_income - plan_input.monthly_expenses) / plan_input.monthly_income
    emergency_months = (
        plan_input.current_savings / plan_input.monthly_expenses
        if plan_input.monthly_expenses > 0
        else 0
    )

    if savings_ratio < 0.2:
        actions.append("Reduce discretionary expenses to target at least 20% monthly savings.")
    if emergency_months < 6:
        actions.append("Build emergency fund up to 6 months of expenses before increasing risk.")
    if plan_input.debt_outstanding > plan_input.monthly_income * 6:
        actions.append("Prioritize high-interest debt reduction to improve long-term cash flow.")
    if score.overall < 60:
        actions.append("Focus on stabilizing cash flow and debt before increasing equity allocation.")

    if not actions:
        actions.append("Stay consistent with SIP and review plan quarterly for goal alignment.")
    return actions


def build_plan(plan_input: PlanRequest) -> tuple[PlanData, MoneyHealthScore, list[str]]:
    """Orchestrate deterministic plan generation from user inputs."""

    allocation = risk_to_allocation(plan_input.risk_appetite)
    expected_return = weighted_expected_return(allocation)
    sip = required_monthly_sip(
        target_amount=plan_input.target_amount,
        return_rate=expected_return,
        years=plan_input.investment_horizon_years,
    )
    projection = generate_projection_series(
        monthly_sip=sip,
        return_rate=expected_return,
        years=plan_input.investment_horizon_years,
    )
    projected_corpus = projection[-1].projected_value
    score = compute_money_health_score(plan_input, allocation)
    actions = build_priority_actions(plan_input, score)

    return (
        PlanData(
            monthly_sip=sip,
            expected_return_annual=expected_return,
            allocation=allocation,
            projection=projection,
            target_amount=_round2(plan_input.target_amount),
            projected_corpus=_round2(projected_corpus),
        ),
        score,
        actions,
    )


def build_explain_plan(plan_input: PlanRequest, plan_data: PlanData, score: MoneyHealthScore) -> ExplainPlan:
    """Build auditable deterministic explanation steps for UI and API consumers."""

    investable_surplus = _round2(max(0.0, plan_input.monthly_income - plan_input.monthly_expenses))
    sip_share_percent = 0.0
    if investable_surplus > 0:
        sip_share_percent = _round2((plan_data.monthly_sip / investable_surplus) * 100)

    emergency_months = 0.0
    if plan_input.monthly_expenses > 0:
        emergency_months = _round2(plan_input.current_savings / plan_input.monthly_expenses)

    return ExplainPlan(
        generated_at=datetime.now(timezone.utc),
        assumptions=[
            f"Equity return assumption: {int(settings.equity_return_annual * 100)}% annual",
            f"Debt return assumption: {int(settings.debt_return_annual * 100)}% annual",
            f"Liquid return assumption: {int(settings.liquid_return_annual * 100)}% annual",
            "All calculations are deterministic and use monthly compounding.",
        ],
        steps=[
            ExplainPlanStep(
                key="allocation",
                label="Risk to allocation mapping",
                value=(
                    f"Equity {plan_data.allocation.equity}% | "
                    f"Debt {plan_data.allocation.debt}% | "
                    f"Liquid {plan_data.allocation.liquid}%"
                ),
                formula="Static mapping by risk_appetite",
                evidence={"risk_appetite": plan_input.risk_appetite.value},
            ),
            ExplainPlanStep(
                key="expected_return",
                label="Weighted expected annual return",
                value=f"{_round2(plan_data.expected_return_annual * 100)}%",
                formula="equity%*equity_return + debt%*debt_return + liquid%*liquid_return",
                evidence={
                    "equity_percent": plan_data.allocation.equity,
                    "debt_percent": plan_data.allocation.debt,
                    "liquid_percent": plan_data.allocation.liquid,
                    "weighted_return_decimal": plan_data.expected_return_annual,
                },
            ),
            ExplainPlanStep(
                key="required_sip",
                label="Required SIP for target",
                value=f"INR {_round2(plan_data.monthly_sip):,.2f}",
                formula="target_amount / (((1 + r/12)^(years*12) - 1) / (r/12))",
                evidence={
                    "target_amount": _round2(plan_input.target_amount),
                    "horizon_years": plan_input.investment_horizon_years,
                    "monthly_sip": _round2(plan_data.monthly_sip),
                },
            ),
            ExplainPlanStep(
                key="projection",
                label="Projected corpus at horizon",
                value=f"INR {_round2(plan_data.projected_corpus):,.2f}",
                formula="monthly_sip * (((1 + r/12)^(years*12) - 1) / (r/12))",
                evidence={
                    "horizon_years": plan_input.investment_horizon_years,
                    "projected_corpus": _round2(plan_data.projected_corpus),
                },
            ),
            ExplainPlanStep(
                key="cashflow_fit",
                label="Cashflow fit check",
                value=f"SIP uses {sip_share_percent}% of monthly surplus",
                formula="monthly_sip / max(monthly_income - monthly_expenses, 0)",
                evidence={
                    "monthly_income": _round2(plan_input.monthly_income),
                    "monthly_expenses": _round2(plan_input.monthly_expenses),
                    "surplus": investable_surplus,
                    "sip_share_percent": sip_share_percent,
                },
            ),
            ExplainPlanStep(
                key="health_score",
                label="Money health score",
                value=f"{score.overall}/100",
                formula="0.35*savings + 0.25*debt + 0.25*emergency + 0.15*diversification",
                evidence={
                    "savings_score": score.components.savings_ratio,
                    "debt_score": score.components.debt_ratio,
                    "emergency_score": score.components.emergency_fund,
                    "diversification_score": score.components.diversification,
                    "emergency_months": emergency_months,
                },
            ),
        ],
        checks=[
            (
                "Projection check passed: final projection equals projected corpus."
                if plan_data.projection and _round2(plan_data.projection[-1].projected_value) == _round2(plan_data.projected_corpus)
                else "Projection check warning: final projection mismatch detected."
            ),
            (
                "SIP feasibility warning: required SIP exceeds current monthly surplus."
                if plan_data.monthly_sip > investable_surplus
                else "SIP feasibility check passed: required SIP is within monthly surplus."
            ),
        ],
    )


def apply_what_if(original_plan: PlanRequest, increase_sip_percent: float | None, change_horizon_years: int | None) -> PlanData:
    """Recompute plan for scenario analysis using deterministic logic only."""

    plan_data, _, _ = build_plan(original_plan)

    adjusted_horizon = change_horizon_years or original_plan.investment_horizon_years
    adjusted_sip = plan_data.monthly_sip
    if increase_sip_percent is not None:
        adjusted_sip = adjusted_sip * (1 + (increase_sip_percent / 100))

    projection = generate_projection_series(
        monthly_sip=adjusted_sip,
        return_rate=plan_data.expected_return_annual,
        years=adjusted_horizon,
    )

    return PlanData(
        monthly_sip=_round2(adjusted_sip),
        expected_return_annual=plan_data.expected_return_annual,
        allocation=plan_data.allocation,
        projection=projection,
        target_amount=plan_data.target_amount,
        projected_corpus=projection[-1].projected_value,
    )


def projection_to_dicts(projection: Iterable[ProjectionPoint]) -> list[dict[str, float | int]]:
    """Helper for chart-friendly serialization when needed by external consumers."""

    return [
        {
            "year": p.year,
            "invested_amount": p.invested_amount,
            "projected_value": p.projected_value,
        }
        for p in projection
    ]


def build_multi_goal_plan(payload: MultiGoalPlanRequest) -> MultiGoalPlanResponse:
    """Generate a deterministic multi-goal allocation plan under SIP constraints."""

    allocation = risk_to_allocation(payload.risk_appetite)
    expected_return = weighted_expected_return(allocation)

    investable = max(0.0, payload.monthly_income - payload.monthly_expenses)
    if payload.max_monthly_sip is not None:
        total_capacity = min(investable, payload.max_monthly_sip)
    else:
        total_capacity = investable
    total_capacity = _round2(total_capacity)

    ordered_goals = sorted(payload.goals, key=lambda g: (g.priority, g.horizon_years, g.name.lower()))

    required_map: dict[str, float] = {}
    for goal in ordered_goals:
        required_map[goal.name] = required_monthly_sip(
            target_amount=goal.target_amount,
            return_rate=expected_return,
            years=goal.horizon_years,
        )

    total_required = _round2(sum(required_map.values()))

    remaining = total_capacity
    results: list[GoalPlanData] = []
    goal_names = {goal.name for goal in ordered_goals}
    for goal in ordered_goals:
        required = required_map[goal.name]
        allocated = min(required, remaining) if remaining > 0 else 0.0
        allocated = _round2(allocated)
        remaining = _round2(max(0.0, remaining - allocated))

        shortfall = _round2(max(0.0, required - allocated))
        if allocated >= required and required > 0:
            status = "fully_funded"
        elif allocated > 0:
            status = "partially_funded"
        else:
            status = "unfunded"

        projection = generate_projection_series(
            monthly_sip=allocated,
            return_rate=expected_return,
            years=goal.horizon_years,
        )
        projected_corpus = projection[-1].projected_value if projection else 0.0
        delayed_required = required_monthly_sip(
            target_amount=goal.target_amount,
            return_rate=expected_return,
            years=min(50, goal.horizon_years + 1),
        )

        results.append(
            GoalPlanData(
                name=goal.name,
                target_amount=_round2(goal.target_amount),
                horizon_years=goal.horizon_years,
                priority=goal.priority,
                required_monthly_sip=required,
                allocated_monthly_sip=allocated,
                shortfall_monthly_sip=shortfall,
                status=status,
                projected_corpus=_round2(projected_corpus),
                projection=projection,
                depends_on=goal.depends_on,
                linked_to=goal.linked_to,
                delay_by_one_year_required_sip=delayed_required,
                delay_by_one_year_sip_change=_round2(delayed_required - required),
            )
        )

    total_allocated = _round2(sum(goal.allocated_monthly_sip for goal in results))

    status_by_goal = {goal.name: goal.status for goal in results}
    for goal in results:
        goal.blocking_goals = [
            dep
            for dep in goal.depends_on
            if dep in status_by_goal and status_by_goal[dep] != "fully_funded"
        ]
        goal.is_blocked = len(goal.blocking_goals) > 0

    graph_edges: list[GoalGraphEdge] = []
    unknown_dependencies: list[str] = []
    for goal in results:
        for dep in goal.depends_on:
            if dep in goal_names:
                graph_edges.append(GoalGraphEdge(source=goal.name, target=dep, relation="depends_on"))
            else:
                unknown_dependencies.append(f"{goal.name} -> {dep}")
        for linked in goal.linked_to:
            if linked in goal_names:
                graph_edges.append(GoalGraphEdge(source=goal.name, target=linked, relation="linked_to"))

    insights = [
        (
            f"{goal.name} is underfunded by INR {goal.shortfall_monthly_sip:,.0f} per month."
            if goal.status == "partially_funded"
            else f"{goal.name} is currently unfunded."
        )
        for goal in results
        if goal.status != "fully_funded"
    ]
    insights.extend(
        [
            f"{goal.name} is blocked by unresolved dependencies: {', '.join(goal.blocking_goals)}."
            for goal in results
            if goal.is_blocked
        ]
    )
    if unknown_dependencies:
        insights.append(
            f"Dependency references not found in current goals: {'; '.join(unknown_dependencies)}."
        )

    recommendations: list[str] = []
    if total_required > total_capacity:
        gap = _round2(total_required - total_capacity)
        recommendations.append(f"Increase investable SIP capacity by INR {gap:,.0f} per month to fund all goals.")

        low_priority_goal = max(results, key=lambda g: (g.priority, g.horizon_years))
        recommendations.append(
            f"Delay {low_priority_goal.name} by 1 year or reduce its target to lower monthly burden."
        )
        recommendations.append("Reduce discretionary expenses or add supplemental income to close the funding gap.")
    else:
        recommendations.append("All goals are currently fundable within your SIP capacity. Maintain contribution discipline.")

    return MultiGoalPlanResponse(
        total_capacity=total_capacity,
        total_required=total_required,
        total_allocated=total_allocated,
        allocation=allocation,
        goals=results,
        goal_graph=GoalGraphMetadata(nodes=[goal.name for goal in results], edges=graph_edges),
        insights=insights,
        recommendations=recommendations,
    )
