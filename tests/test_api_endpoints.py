"""API smoke tests for critical contracts."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _plan_request() -> dict:
    return {
        "monthly_income": 100_000,
        "monthly_expenses": 50_000,
        "current_savings": 200_000,
        "debt_outstanding": 50_000,
        "investment_horizon_years": 10,
        "risk_appetite": "moderate",
        "target_amount": 5_000_000,
    }


def _multi_goal_request() -> dict:
    return {
        "monthly_income": 120_000,
        "monthly_expenses": 75_000,
        "current_savings": 250_000,
        "debt_outstanding": 100_000,
        "risk_appetite": "moderate",
        "max_monthly_sip": 30_000,
        "goals": [
            {"name": "House", "target_amount": 4_000_000, "horizon_years": 7, "priority": 1},
            {"name": "Retirement", "target_amount": 12_000_000, "horizon_years": 25, "priority": 2},
            {"name": "Emergency", "target_amount": 1_000_000, "horizon_years": 3, "priority": 1},
        ],
    }


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_plan_endpoint_contract() -> None:
    response = client.post("/api/v1/plan", json=_plan_request())
    assert response.status_code == 200
    payload = response.json()
    assert "plan" in payload
    assert "score" in payload
    assert "priority_actions" in payload
    assert "explanation" in payload
    assert "behavioral_flags" in payload
    assert "ai_observations" in payload
    assert "nudges" in payload
    assert "gamification" in payload
    assert "financial_personality" in payload


def test_multi_goal_plan_endpoint_contract() -> None:
    response = client.post("/api/v1/plan/multi-goal", json=_multi_goal_request())
    assert response.status_code == 200
    payload = response.json()
    assert "total_capacity" in payload
    assert "total_required" in payload
    assert "total_allocated" in payload
    assert "allocation" in payload
    assert "goals" in payload
    assert "insights" in payload
    assert "recommendations" in payload
    assert len(payload["goals"]) >= 1


def test_whatif_endpoint_contract() -> None:
    response = client.post(
        "/api/v1/whatif",
        json={
            "original_plan": _plan_request(),
            "modification": {
                "increase_sip_percent": 15,
                "change_horizon_years": 12,
            },
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "updated_plan" in payload
    assert "delta" in payload
    assert "scenario_summary" in payload
    assert "nudges" in payload
    assert "ai_observations" in payload
    assert "gamification" in payload


def test_auth_and_save_plan_flow() -> None:
    email = f"demo-{uuid4().hex[:8]}@example.com"
    password = "DemoPass123"

    signup = client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    assert signup.status_code == 200
    token = signup.json()["access_token"]

    plan_response = client.post("/api/v1/plan", json=_plan_request())
    assert plan_response.status_code == 200

    save = client.post(
        "/api/v1/plans/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "plan_input": _plan_request(),
            "plan_output": plan_response.json(),
        },
    )
    assert save.status_code == 200

    listing = client.get("/api/v1/plans", headers={"Authorization": f"Bearer {token}"})
    assert listing.status_code == 200
    assert isinstance(listing.json(), list)
