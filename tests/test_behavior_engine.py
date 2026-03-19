"""Tests for deterministic behavioral intelligence engine."""

from app.models import PlanRequest
from app.services.behavior import (
    analyze_behavior,
    build_gamification,
    classify_financial_personality,
    detect_nudges,
)
from app.services.finance import build_plan


def test_analyze_behavior_detects_low_savings_and_spending_risk() -> None:
    payload = PlanRequest(
        monthly_income=100_000,
        monthly_expenses=95_000,
        current_savings=50_000,
        debt_outstanding=800_000,
        investment_horizon_years=10,
        risk_appetite="conservative",
        target_amount=3_000_000,
        existing_investments=[],
    )
    flags = analyze_behavior(payload)
    assert "Low savings rate detected" in flags
    assert "High spending risk" in flags
    assert "No existing investments found" in flags


def test_detect_nudges_returns_structured_output() -> None:
    payload = PlanRequest(
        monthly_income=100_000,
        monthly_expenses=92_000,
        current_savings=60_000,
        debt_outstanding=100_000,
        investment_horizon_years=8,
        risk_appetite="moderate",
        target_amount=1_000_000,
    )
    plan, score, _ = build_plan(payload)
    nudges = detect_nudges(payload, plan)
    assert len(nudges) >= 1
    assert nudges[0].severity in {"info", "warning", "celebration"}
    assert score.overall >= 0


def test_gamification_and_personality_are_deterministic() -> None:
    payload = PlanRequest(
        monthly_income=120_000,
        monthly_expenses=70_000,
        current_savings=250_000,
        debt_outstanding=100_000,
        investment_horizon_years=12,
        risk_appetite="aggressive",
        target_amount=9_000_000,
        existing_investments=["Mutual Fund"],
    )
    plan, score, _ = build_plan(payload)
    gamification = build_gamification(payload, plan, score.overall)
    personality = classify_financial_personality(payload, score.overall)
    assert gamification.points >= 0
    assert 0 <= gamification.progress_percent <= 100
    assert personality in {"Risk Taker", "Balanced Planner", "Conservative Builder"}
