"""API routes for health, plan generation, and what-if analysis."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.models import (
    AuthLoginRequest,
    AuthSignupRequest,
    AuthTokenResponse,
    GoalCreateRequest,
    GoalResponse,
    GoalStatus,
    GoalUpdateRequest,
    MultiGoalPlanRequest,
    MultiGoalPlanResponse,
    PlanResponse,
    PlanRequest,
    SavePlanRequest,
    SavedPlanResponse,
    WhatIfDelta,
    WhatIfRequest,
    WhatIfResponse,
)
from app.db.database import get_session
from app.db.models import GoalLifecycle, SavedPlan, User
from app.services.auth import create_access_token, decode_access_token, hash_password, verify_password
from app.services.behavior import (
    analyze_behavior,
    build_coach_insight,
    build_future_simulation,
    build_gamification,
    build_whatif_impact_message,
    classify_financial_personality,
    detect_nudges,
)
from app.services.finance import apply_what_if, build_explain_plan, build_multi_goal_plan, build_plan
from app.services.llm import generate_behavioral_observations, generate_explanation, generate_scenario_summary


router = APIRouter()
security = HTTPBearer(auto_error=False)


def _deserialize_goal_ids(raw_value: str) -> list[int]:
    try:
        parsed = json.loads(raw_value)
    except (TypeError, ValueError):
        return []
    if not isinstance(parsed, list):
        return []

    ids: list[int] = []
    for item in parsed:
        if isinstance(item, int) and item > 0:
            ids.append(item)
    return list(dict.fromkeys(ids))


def _serialize_goal_ids(goal_ids: list[int]) -> str:
    return json.dumps(list(dict.fromkeys(goal_ids)))


def _goal_blockers(goal: GoalLifecycle, goals_by_id: dict[int, GoalLifecycle]) -> list[int]:
    blockers: list[int] = []
    for dependency_id in _deserialize_goal_ids(goal.depends_on_goal_ids_json):
        dependency_goal = goals_by_id.get(dependency_id)
        if dependency_goal and dependency_goal.status != GoalStatus.completed.value:
            blockers.append(dependency_id)
    return blockers


def _validate_goal_links(
    session: Session,
    user_id: int,
    depends_on_goal_ids: list[int],
    linked_to_goal_ids: list[int],
    current_goal_id: int | None = None,
) -> None:
    if current_goal_id and current_goal_id in depends_on_goal_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Goal cannot depend on itself")

    all_referenced_ids = list(dict.fromkeys(depends_on_goal_ids + linked_to_goal_ids))
    if all_referenced_ids:
        referenced_goals = session.exec(
            select(GoalLifecycle).where(
                GoalLifecycle.user_id == user_id,
                GoalLifecycle.id.in_(all_referenced_ids),
            )
        ).all()
        found_ids = {goal.id for goal in referenced_goals if goal.id is not None}
        missing_ids = sorted(goal_id for goal_id in all_referenced_ids if goal_id not in found_ids)
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown goal references: {missing_ids}",
            )

    user_goals = session.exec(select(GoalLifecycle).where(GoalLifecycle.user_id == user_id)).all()
    adjacency: dict[int, list[int]] = {
        goal.id: _deserialize_goal_ids(goal.depends_on_goal_ids_json)
        for goal in user_goals
        if goal.id is not None
    }

    if current_goal_id is not None:
        adjacency[current_goal_id] = depends_on_goal_ids

    visited: set[int] = set()
    visiting: set[int] = set()

    def _has_cycle(node_id: int) -> bool:
        if node_id in visiting:
            return True
        if node_id in visited:
            return False

        visiting.add(node_id)
        for child_id in adjacency.get(node_id, []):
            if child_id in adjacency and _has_cycle(child_id):
                return True
        visiting.remove(node_id)
        visited.add(node_id)
        return False

    for goal_id in adjacency:
        if _has_cycle(goal_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Dependency cycle detected in goals",
            )


def _goal_to_response(goal: GoalLifecycle, goals_by_id: dict[int, GoalLifecycle] | None = None) -> GoalResponse:
    progress_percent = 0.0
    if goal.target_amount > 0:
        progress_percent = round(min(100.0, max(0.0, (goal.current_progress_amount / goal.target_amount) * 100)), 2)

    dependencies = _deserialize_goal_ids(goal.depends_on_goal_ids_json)
    links = _deserialize_goal_ids(goal.linked_to_goal_ids_json)
    blocked_by = _goal_blockers(goal, goals_by_id or {}) if goals_by_id else []

    return GoalResponse(
        id=goal.id,
        name=goal.name,
        target_amount=goal.target_amount,
        horizon_years=goal.horizon_years,
        priority=goal.priority,
        current_progress_amount=goal.current_progress_amount,
        monthly_contribution=goal.monthly_contribution,
        depends_on_goal_ids=dependencies,
        linked_to_goal_ids=links,
        blocked_by_goal_ids=blocked_by,
        status=GoalStatus(goal.status),
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        progress_percent=progress_percent,
    )


def _get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        email = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.get("/health")
def health_check() -> dict[str, str]:
    """Simple service liveness endpoint."""

    return {"status": "ok"}


@router.post("/auth/signup", response_model=AuthTokenResponse)
def signup(payload: AuthSignupRequest, session: Session = Depends(get_session)) -> AuthTokenResponse:
    """Create user account and return access token."""

    existing = session.exec(select(User).where(User.email == payload.email.lower())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    session.add(user)
    session.commit()

    token = create_access_token(user.email)
    return AuthTokenResponse(access_token=token)


@router.post("/auth/login", response_model=AuthTokenResponse)
def login(payload: AuthLoginRequest, session: Session = Depends(get_session)) -> AuthTokenResponse:
    """Login user and return JWT token."""

    user = session.exec(select(User).where(User.email == payload.email.lower())).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user.email)
    return AuthTokenResponse(access_token=token)


@router.post("/plan", response_model=PlanResponse)
def generate_plan(payload: PlanRequest) -> PlanResponse:
    """Generate a deterministic investment plan and explanatory narrative."""

    plan, score, actions = build_plan(payload)
    explain_plan = build_explain_plan(payload, plan, score)
    explanation = generate_explanation(plan)
    behavioral_flags = analyze_behavior(payload)
    nudges = detect_nudges(payload, plan)
    gamification = build_gamification(payload, plan, score.overall)
    financial_personality = classify_financial_personality(payload, score.overall)
    ai_observations = generate_behavioral_observations(behavioral_flags, payload.model_dump())
    coach_insight = build_coach_insight(payload, plan, behavioral_flags)
    future_simulation = build_future_simulation(plan, payload.investment_horizon_years)

    return PlanResponse(
        plan=plan,
        score=score,
        priority_actions=actions,
        explanation=explanation,
        explain_plan=explain_plan,
        coach_insight=coach_insight,
        future_simulation=future_simulation,
        behavioral_flags=behavioral_flags,
        ai_observations=ai_observations,
        nudges=nudges,
        gamification=gamification,
        financial_personality=financial_personality,
    )


@router.post("/plan/multi-goal", response_model=MultiGoalPlanResponse)
def generate_multi_goal_plan(payload: MultiGoalPlanRequest) -> MultiGoalPlanResponse:
    """Generate deterministic multi-goal plan with constrained SIP allocation."""

    return build_multi_goal_plan(payload)


@router.post("/whatif", response_model=WhatIfResponse)
def what_if(payload: WhatIfRequest) -> WhatIfResponse:
    """Run deterministic scenario analysis from supported modifications."""

    baseline_plan, baseline_score, _ = build_plan(payload.original_plan)
    updated_plan = apply_what_if(
        original_plan=payload.original_plan,
        increase_sip_percent=payload.modification.increase_sip_percent,
        change_horizon_years=payload.modification.change_horizon_years,
    )

    delta = WhatIfDelta(
        monthly_sip_delta=round(updated_plan.monthly_sip - baseline_plan.monthly_sip, 2),
        projected_corpus_delta=round(
            updated_plan.projected_corpus - baseline_plan.projected_corpus,
            2,
        ),
        horizon_delta_years=(payload.modification.change_horizon_years or payload.original_plan.investment_horizon_years)
        - payload.original_plan.investment_horizon_years,
    )

    explanation = generate_explanation(updated_plan)
    behavioral_flags = analyze_behavior(payload.original_plan)
    ai_observations = generate_behavioral_observations(behavioral_flags, payload.original_plan.model_dump())
    nudges = detect_nudges(payload.original_plan, updated_plan)
    gamification = build_gamification(payload.original_plan, updated_plan, baseline_score.overall)
    scenario_summary = generate_scenario_summary(
        baseline_plan=baseline_plan,
        updated_plan=updated_plan,
        delta=delta.model_dump(),
    )
    impact_message = build_whatif_impact_message(
        projected_corpus_delta=delta.projected_corpus_delta,
        horizon_delta_years=delta.horizon_delta_years,
    )
    return WhatIfResponse(
        updated_plan=updated_plan,
        delta=delta,
        explanation=explanation,
        scenario_summary=scenario_summary,
        whatif_impact_message=impact_message,
        nudges=nudges,
        ai_observations=ai_observations,
        gamification=gamification,
    )


@router.post("/plans/save", response_model=SavedPlanResponse)
def save_plan(
    payload: SavePlanRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user),
) -> SavedPlanResponse:
    """Persist generated plan for authenticated users."""

    record = SavedPlan(
        user_id=current_user.id,
        plan_input_json=json.dumps(payload.plan_input.model_dump(mode="json")),
        plan_output_json=json.dumps(payload.plan_output.model_dump(mode="json")),
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    return SavedPlanResponse(
        id=record.id,
        created_at=record.created_at,
        plan_input=payload.plan_input,
        plan_output=payload.plan_output,
    )


@router.get("/plans", response_model=list[SavedPlanResponse])
def list_saved_plans(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user),
) -> list[SavedPlanResponse]:
    """List all saved plans for authenticated user."""

    records = session.exec(
        select(SavedPlan)
        .where(SavedPlan.user_id == current_user.id)
        .order_by(SavedPlan.created_at.desc())
    ).all()

    output: list[SavedPlanResponse] = []
    for record in records:
        output.append(
            SavedPlanResponse(
                id=record.id,
                created_at=record.created_at,
                plan_input=PlanRequest(**json.loads(record.plan_input_json)),
                plan_output=PlanResponse(**json.loads(record.plan_output_json)),
            )
        )
    return output


@router.post("/goals", response_model=GoalResponse)
def create_goal(
    payload: GoalCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user),
) -> GoalResponse:
    """Create a new goal lifecycle record for the authenticated user."""

    _validate_goal_links(
        session=session,
        user_id=current_user.id,
        depends_on_goal_ids=payload.depends_on_goal_ids,
        linked_to_goal_ids=payload.linked_to_goal_ids,
    )

    goal = GoalLifecycle(
        user_id=current_user.id,
        name=payload.name,
        target_amount=payload.target_amount,
        horizon_years=payload.horizon_years,
        priority=payload.priority,
        current_progress_amount=payload.current_progress_amount,
        monthly_contribution=payload.monthly_contribution,
        depends_on_goal_ids_json=_serialize_goal_ids(payload.depends_on_goal_ids),
        linked_to_goal_ids_json=_serialize_goal_ids(payload.linked_to_goal_ids),
        status=payload.status.value,
    )
    session.add(goal)
    session.commit()
    session.refresh(goal)
    all_goals = session.exec(select(GoalLifecycle).where(GoalLifecycle.user_id == current_user.id)).all()
    goals_by_id = {item.id: item for item in all_goals if item.id is not None}
    return _goal_to_response(goal, goals_by_id)


@router.get("/goals", response_model=list[GoalResponse])
def list_goals(
    include_archived: bool = Query(default=False),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user),
) -> list[GoalResponse]:
    """List goal lifecycle records for authenticated user."""

    all_goals = session.exec(
        select(GoalLifecycle)
        .where(GoalLifecycle.user_id == current_user.id)
        .order_by(GoalLifecycle.created_at.desc())
    ).all()

    goals_by_id = {goal.id: goal for goal in all_goals if goal.id is not None}
    visible_goals = all_goals
    if not include_archived:
        visible_goals = [goal for goal in all_goals if goal.status != GoalStatus.archived.value]

    return [_goal_to_response(goal, goals_by_id) for goal in visible_goals]


@router.patch("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user),
) -> GoalResponse:
    """Update mutable fields for a user's goal lifecycle record."""

    goal = session.exec(
        select(GoalLifecycle).where(GoalLifecycle.id == goal_id, GoalLifecycle.user_id == current_user.id)
    ).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    updates = payload.model_dump(exclude_none=True)
    next_depends_on = updates.get("depends_on_goal_ids")
    next_linked_to = updates.get("linked_to_goal_ids")
    depends_on_goal_ids = (
        next_depends_on if next_depends_on is not None else _deserialize_goal_ids(goal.depends_on_goal_ids_json)
    )
    linked_to_goal_ids = (
        next_linked_to if next_linked_to is not None else _deserialize_goal_ids(goal.linked_to_goal_ids_json)
    )

    _validate_goal_links(
        session=session,
        user_id=current_user.id,
        depends_on_goal_ids=depends_on_goal_ids,
        linked_to_goal_ids=linked_to_goal_ids,
        current_goal_id=goal.id,
    )

    if "depends_on_goal_ids" in updates:
        updates["depends_on_goal_ids_json"] = _serialize_goal_ids(updates.pop("depends_on_goal_ids"))
    if "linked_to_goal_ids" in updates:
        updates["linked_to_goal_ids_json"] = _serialize_goal_ids(updates.pop("linked_to_goal_ids"))
    if "status" in updates:
        updates["status"] = updates["status"].value
    for field_name, value in updates.items():
        setattr(goal, field_name, value)

    goal.updated_at = datetime.now(timezone.utc)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    all_goals = session.exec(select(GoalLifecycle).where(GoalLifecycle.user_id == current_user.id)).all()
    goals_by_id = {item.id: item for item in all_goals if item.id is not None}
    return _goal_to_response(goal, goals_by_id)


@router.post("/goals/{goal_id}/archive", response_model=GoalResponse)
def archive_goal(
    goal_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user),
) -> GoalResponse:
    """Archive a goal lifecycle record for the authenticated user."""

    goal = session.exec(
        select(GoalLifecycle).where(GoalLifecycle.id == goal_id, GoalLifecycle.user_id == current_user.id)
    ).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    goal.status = GoalStatus.archived.value
    goal.updated_at = datetime.now(timezone.utc)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    all_goals = session.exec(select(GoalLifecycle).where(GoalLifecycle.user_id == current_user.id)).all()
    goals_by_id = {item.id: item for item in all_goals if item.id is not None}
    return _goal_to_response(goal, goals_by_id)

