"""Pydantic models for request and response contracts."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, model_validator
from typing import Optional


class RiskAppetite(str, Enum):
    conservative = "conservative"
    moderate = "moderate"
    aggressive = "aggressive"


class PlanRequest(BaseModel):
    """Input payload for generating a deterministic financial plan."""

    monthly_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    current_savings: float = Field(ge=0)
    debt_outstanding: float = Field(ge=0)
    investment_horizon_years: int = Field(ge=1, le=50)
    risk_appetite: RiskAppetite
    target_amount: float = Field(gt=0, description="Primary investment target amount.")
    existing_investments: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_expenses(self) -> "PlanRequest":
        if self.monthly_expenses >= self.monthly_income:
            raise ValueError("monthly_expenses must be lower than monthly_income")
        return self


class GoalRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    target_amount: float = Field(gt=0)
    horizon_years: int = Field(ge=1, le=50)
    priority: int = Field(ge=1, le=5)
    depends_on: list[str] = Field(default_factory=list)
    linked_to: list[str] = Field(default_factory=list)


class MultiGoalPlanRequest(BaseModel):
    monthly_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    current_savings: float = Field(ge=0)
    debt_outstanding: float = Field(ge=0)
    risk_appetite: RiskAppetite
    goals: list[GoalRequest] = Field(min_length=1, max_length=10)
    max_monthly_sip: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_expenses(self) -> "MultiGoalPlanRequest":
        if self.monthly_expenses >= self.monthly_income:
            raise ValueError("monthly_expenses must be lower than monthly_income")
        return self


class Allocation(BaseModel):
    equity: int = Field(ge=0, le=100)
    debt: int = Field(ge=0, le=100)
    liquid: int = Field(ge=0, le=100)


class ProjectionPoint(BaseModel):
    year: int = Field(ge=1)
    invested_amount: float = Field(ge=0)
    projected_value: float = Field(ge=0)


class MoneyHealthScoreBreakdown(BaseModel):
    savings_ratio: int = Field(ge=0, le=100)
    debt_ratio: int = Field(ge=0, le=100)
    emergency_fund: int = Field(ge=0, le=100)
    diversification: int = Field(ge=0, le=100)


class MoneyHealthScore(BaseModel):
    overall: int = Field(ge=0, le=100)
    components: MoneyHealthScoreBreakdown


class PlanData(BaseModel):
    monthly_sip: float = Field(ge=0)
    expected_return_annual: float = Field(ge=0)
    allocation: Allocation
    projection: list[ProjectionPoint]
    target_amount: float = Field(ge=0)
    projected_corpus: float = Field(ge=0)


class GoalPlanData(BaseModel):
    name: str
    target_amount: float = Field(ge=0)
    horizon_years: int = Field(ge=1)
    priority: int = Field(ge=1, le=5)
    required_monthly_sip: float = Field(ge=0)
    allocated_monthly_sip: float = Field(ge=0)
    shortfall_monthly_sip: float = Field(ge=0)
    status: str = Field(pattern="^(fully_funded|partially_funded|unfunded)$")
    projected_corpus: float = Field(ge=0)
    projection: list[ProjectionPoint]
    depends_on: list[str] = Field(default_factory=list)
    linked_to: list[str] = Field(default_factory=list)
    blocking_goals: list[str] = Field(default_factory=list)
    is_blocked: bool = False
    delay_by_one_year_required_sip: float = Field(ge=0)
    delay_by_one_year_sip_change: float


class GoalGraphEdge(BaseModel):
    source: str
    target: str
    relation: str = Field(pattern="^(depends_on|linked_to)$")


class GoalGraphMetadata(BaseModel):
    nodes: list[str] = Field(default_factory=list)
    edges: list[GoalGraphEdge] = Field(default_factory=list)


class MultiGoalPlanResponse(BaseModel):
    total_capacity: float = Field(ge=0)
    total_required: float = Field(ge=0)
    total_allocated: float = Field(ge=0)
    allocation: Allocation
    goals: list[GoalPlanData]
    goal_graph: GoalGraphMetadata
    insights: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class PlanResponse(BaseModel):
    plan: PlanData
    score: MoneyHealthScore
    priority_actions: list[str]
    explanation: str
    coach_insight: Optional["CoachInsight"] = None
    future_simulation: Optional["FutureSimulation"] = None
    behavioral_flags: list[str] = Field(default_factory=list)
    ai_observations: list[str] = Field(default_factory=list)
    nudges: list["Nudge"] = Field(default_factory=list)
    gamification: Optional["Gamification"] = None
    financial_personality: Optional[str] = None


class WhatIfModification(BaseModel):
    """Supported what-if knobs for deterministic recomputation."""

    increase_sip_percent: float | None = Field(default=None, ge=0, le=300)
    change_horizon_years: int | None = Field(default=None, ge=1, le=50)


class WhatIfRequest(BaseModel):
    original_plan: PlanRequest
    modification: WhatIfModification


class WhatIfDelta(BaseModel):
    monthly_sip_delta: float
    projected_corpus_delta: float
    horizon_delta_years: int


class WhatIfResponse(BaseModel):
    updated_plan: PlanData
    delta: WhatIfDelta
    explanation: str
    scenario_summary: str | None = None
    whatif_impact_message: str | None = None
    nudges: list["Nudge"] = Field(default_factory=list)
    ai_observations: list[str] = Field(default_factory=list)
    gamification: Optional["Gamification"] = None


class CoachInsight(BaseModel):
    headline: str
    consequence: str
    fixes: list[str] = Field(default_factory=list)
    severity: str = Field(pattern="^(low|medium|high)$")


class FutureSimulation(BaseModel):
    projection_year: int
    projected_corpus: float
    estimated_passive_income_monthly: float
    narrative: str


class Nudge(BaseModel):
    title: str
    message: str
    severity: str = Field(pattern="^(info|warning|celebration)$")


class Badge(BaseModel):
    name: str
    description: str
    icon: str


class Gamification(BaseModel):
    points: int = Field(ge=0)
    progress_percent: int = Field(ge=0, le=100)
    badges: list[Badge] = Field(default_factory=list)


class AuthSignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class AuthLoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SavePlanRequest(BaseModel):
    plan_input: PlanRequest
    plan_output: PlanResponse


class SavedPlanResponse(BaseModel):
    id: int
    created_at: datetime
    plan_input: PlanRequest
    plan_output: PlanResponse

