"""API routes for health, plan generation, and what-if analysis."""

import json

from fastapi import APIRouter
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.models import (
    AuthLoginRequest,
    AuthSignupRequest,
    AuthTokenResponse,
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
from app.db.models import SavedPlan, User
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
from app.services.finance import apply_what_if, build_multi_goal_plan, build_plan
from app.services.llm import generate_behavioral_observations, generate_explanation, generate_scenario_summary


router = APIRouter()
security = HTTPBearer(auto_error=False)


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
        plan_input_json=json.dumps(payload.plan_input.model_dump()),
        plan_output_json=json.dumps(payload.plan_output.model_dump()),
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

