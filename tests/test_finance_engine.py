"""Unit tests for deterministic finance logic."""

from app.models import MultiGoalPlanRequest, PlanRequest
from app.services.finance import (
    build_multi_goal_plan,
    build_plan,
    future_value,
    generate_projection_series,
    required_monthly_sip,
)


def test_required_monthly_sip_positive_and_reasonable() -> None:
    sip = required_monthly_sip(target_amount=5_000_000, return_rate=0.10, years=10)
    assert sip > 0
    assert sip < 100_000


def test_future_value_increases_with_years() -> None:
    fv_5 = future_value(monthly_sip=10_000, return_rate=0.10, years=5)
    fv_10 = future_value(monthly_sip=10_000, return_rate=0.10, years=10)
    assert fv_10 > fv_5


def test_projection_series_structure() -> None:
    projection = generate_projection_series(monthly_sip=20_000, return_rate=0.11, years=8)
    assert len(projection) == 8
    assert projection[0].year == 1
    assert projection[-1].year == 8
    assert projection[-1].projected_value > projection[0].projected_value


def test_build_plan_returns_score_actions_projection() -> None:
    payload = PlanRequest(
        monthly_income=120_000,
        monthly_expenses=60_000,
        current_savings=300_000,
        debt_outstanding=100_000,
        investment_horizon_years=12,
        risk_appetite="moderate",
        target_amount=8_000_000,
    )
    plan, score, actions = build_plan(payload)
    assert plan.monthly_sip > 0
    assert len(plan.projection) == payload.investment_horizon_years
    assert 0 <= score.overall <= 100
    assert len(actions) >= 1


def test_multi_goal_plan_allocates_within_capacity_by_priority() -> None:
    payload = MultiGoalPlanRequest(
        monthly_income=100_000,
        monthly_expenses=80_000,
        current_savings=200_000,
        debt_outstanding=50_000,
        risk_appetite="moderate",
        max_monthly_sip=20_000,
        goals=[
            {"name": "House", "target_amount": 3_000_000, "horizon_years": 5, "priority": 1},
            {"name": "Retirement", "target_amount": 10_000_000, "horizon_years": 25, "priority": 2},
            {"name": "Travel", "target_amount": 1_000_000, "horizon_years": 4, "priority": 3},
        ],
    )

    response = build_multi_goal_plan(payload=payload)
    assert response.total_capacity == 20_000
    assert response.total_allocated <= response.total_capacity
    assert len(response.goals) == 3
    assert any(goal.status != "fully_funded" for goal in response.goals)
    assert len(response.recommendations) >= 1


def test_multi_goal_plan_fully_funds_when_capacity_sufficient() -> None:
    payload = MultiGoalPlanRequest(
        monthly_income=200_000,
        monthly_expenses=60_000,
        current_savings=400_000,
        debt_outstanding=0,
        risk_appetite="moderate",
        goals=[
            {"name": "Emergency Fund", "target_amount": 1_000_000, "horizon_years": 3, "priority": 1},
            {"name": "Retirement", "target_amount": 5_000_000, "horizon_years": 20, "priority": 2},
        ],
    )

    response = build_multi_goal_plan(payload=payload)
    assert response.total_allocated <= response.total_capacity
    assert all(goal.status == "fully_funded" for goal in response.goals)
