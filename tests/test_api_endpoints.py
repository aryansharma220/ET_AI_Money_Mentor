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
    assert "explain_plan" in payload
    assert "steps" in payload["explain_plan"]
    assert len(payload["explain_plan"]["steps"]) >= 1
    assert "checks" in payload["explain_plan"]
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


def test_goal_lifecycle_create_list_update_archive_flow() -> None:
    email = f"goals-{uuid4().hex[:8]}@example.com"
    password = "DemoPass123"

    signup = client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    assert signup.status_code == 200
    token = signup.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    create_payload = {
        "name": "Emergency Fund",
        "target_amount": 600000,
        "horizon_years": 4,
        "priority": 1,
        "current_progress_amount": 50000,
        "monthly_contribution": 10000,
        "depends_on_goal_ids": [],
        "linked_to_goal_ids": [],
        "status": "active",
    }
    create_response = client.post("/api/v1/goals", headers=auth_headers, json=create_payload)
    assert create_response.status_code == 200
    created_goal = create_response.json()
    assert created_goal["name"] == "Emergency Fund"
    assert created_goal["status"] == "active"
    assert created_goal["progress_percent"] > 0
    assert created_goal["depends_on_goal_ids"] == []
    assert created_goal["blocked_by_goal_ids"] == []

    list_response = client.get("/api/v1/goals", headers=auth_headers)
    assert list_response.status_code == 200
    listed_goals = list_response.json()
    assert any(goal["id"] == created_goal["id"] for goal in listed_goals)

    update_payload = {
        "current_progress_amount": 150000,
        "monthly_contribution": 12000,
        "depends_on_goal_ids": [],
        "linked_to_goal_ids": [],
        "status": "paused",
    }
    update_response = client.patch(
        f"/api/v1/goals/{created_goal['id']}",
        headers=auth_headers,
        json=update_payload,
    )
    assert update_response.status_code == 200
    updated_goal = update_response.json()
    assert updated_goal["current_progress_amount"] == 150000
    assert updated_goal["monthly_contribution"] == 12000
    assert updated_goal["status"] == "paused"
    assert updated_goal["depends_on_goal_ids"] == []

    archive_response = client.post(f"/api/v1/goals/{created_goal['id']}/archive", headers=auth_headers)
    assert archive_response.status_code == 200
    archived_goal = archive_response.json()
    assert archived_goal["status"] == "archived"

    default_list_after_archive = client.get("/api/v1/goals", headers=auth_headers)
    assert default_list_after_archive.status_code == 200
    assert all(goal["id"] != created_goal["id"] for goal in default_list_after_archive.json())

    archived_list_response = client.get("/api/v1/goals?include_archived=true", headers=auth_headers)
    assert archived_list_response.status_code == 200
    assert any(goal["id"] == created_goal["id"] for goal in archived_list_response.json())


def test_goal_dependencies_blockers_and_cycle_validation() -> None:
    email = f"goals-deps-{uuid4().hex[:8]}@example.com"
    password = "DemoPass123"

    signup = client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    assert signup.status_code == 200
    token = signup.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    goal_a = client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json={
            "name": "Emergency Fund",
            "target_amount": 500000,
            "horizon_years": 3,
            "priority": 1,
            "current_progress_amount": 50000,
            "monthly_contribution": 10000,
            "status": "active",
        },
    )
    assert goal_a.status_code == 200
    goal_a_id = goal_a.json()["id"]

    goal_b = client.post(
        "/api/v1/goals",
        headers=auth_headers,
        json={
            "name": "Home Downpayment",
            "target_amount": 1500000,
            "horizon_years": 8,
            "priority": 2,
            "current_progress_amount": 100000,
            "monthly_contribution": 20000,
            "depends_on_goal_ids": [goal_a_id],
            "linked_to_goal_ids": [],
            "status": "active",
        },
    )
    assert goal_b.status_code == 200
    goal_b_payload = goal_b.json()
    goal_b_id = goal_b_payload["id"]
    assert goal_b_payload["depends_on_goal_ids"] == [goal_a_id]
    assert goal_b_payload["blocked_by_goal_ids"] == [goal_a_id]

    cycle_attempt = client.patch(
        f"/api/v1/goals/{goal_a_id}",
        headers=auth_headers,
        json={"depends_on_goal_ids": [goal_b_id]},
    )
    assert cycle_attempt.status_code == 422

    complete_goal_a = client.patch(
        f"/api/v1/goals/{goal_a_id}",
        headers=auth_headers,
        json={"status": "completed"},
    )
    assert complete_goal_a.status_code == 200

    goals_listing = client.get("/api/v1/goals", headers=auth_headers)
    assert goals_listing.status_code == 200
    goals_by_id = {goal["id"]: goal for goal in goals_listing.json()}
    assert goals_by_id[goal_b_id]["blocked_by_goal_ids"] == []

