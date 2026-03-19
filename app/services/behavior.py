"""Deterministic behavioral intelligence layer.

This module evaluates user behavior from known plan inputs and outputs
structured signals for nudges and gamification.
"""

from __future__ import annotations

from datetime import datetime

from app.models import Badge, CoachInsight, FutureSimulation, Gamification, Nudge, PlanData, PlanRequest


def _savings_rate(plan_input: PlanRequest) -> float:
    return (plan_input.monthly_income - plan_input.monthly_expenses) / plan_input.monthly_income


def analyze_behavior(plan_input: PlanRequest) -> list[str]:
    """Return deterministic behavioral risk/opportunity flags."""

    flags: list[str] = []
    savings_rate = _savings_rate(plan_input)
    expense_ratio = plan_input.monthly_expenses / plan_input.monthly_income

    if savings_rate < 0.2:
        flags.append("Low savings rate detected")
    if expense_ratio > 0.9:
        flags.append("High spending risk")
    if len(plan_input.existing_investments) == 0:
        flags.append("No existing investments found")
    if plan_input.debt_outstanding > plan_input.monthly_income * 6:
        flags.append("Debt pressure is elevated")

    if not flags:
        flags.append("Healthy financial behavior pattern")
    return flags


def detect_nudges(plan_input: PlanRequest, plan_data: PlanData) -> list[Nudge]:
    """Generate deterministic micro-nudges from simple trigger rules."""

    nudges: list[Nudge] = []
    expense_ratio = plan_input.monthly_expenses / plan_input.monthly_income
    savings_rate = _savings_rate(plan_input)
    progress = (plan_data.projected_corpus / plan_data.target_amount) if plan_data.target_amount > 0 else 0

    if expense_ratio > 0.9:
        cut_needed = plan_input.monthly_expenses - (plan_input.monthly_income * 0.7)
        nudges.append(
            Nudge(
                title="Spending Alert",
                message=(
                    f"At {expense_ratio * 100:.0f}% of income, one bad month breaks your plan. "
                    f"Cut just INR {cut_needed:,.0f}/month to reach financial safety."
                ),
                severity="warning",
            )
        )

    if savings_rate < 0.2:
        monthly_surplus = plan_input.monthly_income - plan_input.monthly_expenses
        nudges.append(
            Nudge(
                title="Easy Win: Add INR 2,000 to SIP",
                message=(
                    f"Your current extra INR {monthly_surplus:,.0f}/month could become ₹{monthly_surplus + 2000:,.0f}. "
                    "That extra ₹2,000 compounds to ₹10L+ by retirement. You're literally leaving money on the table."
                ),
                severity="info",
            )
        )

    if progress >= 0.8:
        gap = max(plan_data.target_amount - plan_data.projected_corpus, 0)
        if gap <= 0:
            nudges.append(
                Nudge(
                    title="You've reached your goal - great work!",
                    message=(
                        "You completed your target corpus with disciplined behavior. "
                        "Now focus on consistency and smart rebalancing to protect this milestone."
                    ),
                    severity="celebration",
                )
            )
        else:
            nudges.append(
                Nudge(
                    title=f"Only INR {gap:,.0f} left to goal",
                    message=(
                        "You've done 80% of the work. Your consistency is stronger than 70% of savers. "
                        "Three more years at this pace and you're done. Don't break now."
                    ),
                    severity="celebration",
                )
            )

    if not nudges:
        monthly_surplus = plan_input.monthly_income - plan_input.monthly_expenses
        nudges.append(
            Nudge(
                title="You're performing as well as top savers",
                message=(
                    f"INR {monthly_surplus:,.0f}/month in surplus, zero debt pressure, SIP covered. "
                    "You're disciplined. Keep this for 2 more years and you hit independence."
                ),
                severity="info",
            )
        )
    return nudges


def classify_financial_personality(plan_input: PlanRequest, score_overall: int) -> str:
    """Classify user into a demo-friendly financial personality label."""

    savings_rate = _savings_rate(plan_input)
    if plan_input.risk_appetite == "aggressive" and savings_rate >= 0.25:
        return "Risk Taker"
    if score_overall >= 70 and savings_rate >= 0.2:
        return "Balanced Planner"
    return "Conservative Builder"


def build_gamification(plan_input: PlanRequest, plan_data: PlanData, score_overall: int) -> Gamification:
    """Generate deterministic points, progress, and badges."""

    progress = 0 if plan_data.target_amount <= 0 else min(100, int(round((plan_data.projected_corpus / plan_data.target_amount) * 100)))
    savings_rate = _savings_rate(plan_input)

    points = progress
    points += 120 if savings_rate >= 0.3 else 40 if savings_rate >= 0.2 else 0
    points += 80 if score_overall >= 75 else 30 if score_overall >= 60 else 0

    badges: list[Badge] = []
    if savings_rate >= 0.3:
        badges.append(Badge(name="Smart Saver", description="You save over 30% of your income.", icon="smart_saver"))
    if progress >= 100:
        badges.append(Badge(name="Goal Crusher", description="Target corpus reached in projection.", icon="goal_crusher"))
    elif progress >= 80:
        badges.append(Badge(name="Almost There", description="You crossed 80% of your target corpus.", icon="almost_there"))
    if plan_input.debt_outstanding <= plan_input.monthly_income * 3:
        badges.append(Badge(name="Risk Reducer", description="Debt load is in a safer zone.", icon="risk_reducer"))

    return Gamification(points=points, progress_percent=progress, badges=badges)


def build_coach_insight(plan_input: PlanRequest, plan_data: PlanData, flags: list[str]) -> CoachInsight:
    """Create a high-visibility deterministic coach insight block."""

    savings_rate = _savings_rate(plan_input)
    available_surplus = plan_input.monthly_income - plan_input.monthly_expenses
    required_sip = plan_data.monthly_sip

    if "High spending risk" in flags:
        severity = "high"
        headline = "Your spending pattern is putting this goal at risk."
        consequence = (
            f"You are spending {plan_input.monthly_expenses / plan_input.monthly_income * 100:.0f}% of income. "
            "A single bad month can break SIP consistency and delay your goal path."
        )
    elif "Low savings rate detected" in flags:
        severity = "medium"
        headline = "Your savings buffer is too thin for long-term consistency."
        consequence = (
            f"Current savings rate is {savings_rate * 100:.0f}%. "
            "At this level, unexpected expenses can force SIP interruptions."
        )
    else:
        severity = "low"
        headline = "You are on track — but your savings rate is borderline."
        consequence = (
            f"At {savings_rate * 100:.0f}% savings rate, small income fluctuations can affect your timeline. "
            "Stay alert and keep this momentum going for the next 6 months."
        )

    expense_cut_needed = max(0, required_sip - available_surplus)
    fixes = [
        f"Increase SIP by INR 2,000 from next month to improve goal resilience.",
        f"Reduce monthly discretionary expenses by INR {expense_cut_needed:,.0f} to fully cover SIP from cashflow.",
    ]

    return CoachInsight(headline=headline, consequence=consequence, fixes=fixes, severity=severity)


def build_future_simulation(plan_data: PlanData, horizon_years: int) -> FutureSimulation:
    """Create deterministic future-oriented narrative for emotional storytelling."""

    projection_year = datetime.now().year + horizon_years
    passive_income_monthly = round((plan_data.projected_corpus * 0.03) / 12, 2)
    narrative = (
        f"By {projection_year}, your projected corpus is INR {plan_data.projected_corpus:,.0f}. "
        f"That may support about INR {passive_income_monthly:,.0f} monthly passive income at a 3% withdrawal rate."
    )
    return FutureSimulation(
        projection_year=projection_year,
        projected_corpus=plan_data.projected_corpus,
        estimated_passive_income_monthly=passive_income_monthly,
        narrative=narrative,
    )


def build_whatif_impact_message(projected_corpus_delta: float, horizon_delta_years: int) -> str:
    """Generate short impact-first what-if language for demo storytelling."""

    if projected_corpus_delta >= 0:
        verb = "gain"
    else:
        verb = "lose"
    
    corpus = f"INR {abs(projected_corpus_delta):,.0f}"

    if horizon_delta_years < 0:
        timeline = f"and reach your goal {abs(horizon_delta_years)} years sooner"
    elif horizon_delta_years > 0:
        timeline = f"but delay your goal by {abs(horizon_delta_years)} years"
    else:
        timeline = "within the same timeframe"

    return f"You can {verb} {corpus} {timeline}."
