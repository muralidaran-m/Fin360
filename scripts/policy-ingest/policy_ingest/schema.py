"""Plan JSON contract shared with Fin360's `npm run policy:apply` (scripts/apply-policy.ts).
Only non-PII fields: people appear as roles, the policy number only as its last 4 digits."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

IsoDate = str  # "YYYY-MM-DD"


class ExtractedPolicy(BaseModel):
    insurer: str = Field(description="Insurance company or AMC name")
    planName: str = Field(description="Product name as printed, without the insurer prefix")
    type: Literal["retirement", "child", "ulip", "mf"]
    startDate: IsoDate = Field(description="Date of commencement / risk start, YYYY-MM-DD")
    premiumAmount: Optional[float] = Field(description="Installment premium in rupees, excluding taxes if stated separately")
    premiumFrequency: Literal["annual", "half-yearly", "quarterly", "monthly", "single"]
    premiumPayingTermYrs: Optional[int]
    policyTermYrs: Optional[int]
    maturityDate: Optional[IsoDate]
    vestingDate: Optional[IsoDate] = Field(description="Retirement plans: when the pension/annuity phase starts")
    sumAssured: Optional[float]
    lockInYrs: Optional[int]
    riders: list[str]
    benefits: list[str] = Field(description="Each benefit in one plain-language sentence")
    summary: str = Field(description="3-5 plain-language sentences a non-expert can follow")
    illustrativeOnly: bool = Field(description="True when the payout figures are projections (e.g. 4%/8% illustrations), not guaranteed")


class Payout(BaseModel):
    date: Optional[IsoDate]
    age: Optional[int] = Field(description="Age of the life assured or child at payout, when the document states it that way")
    amount: Optional[float]
    percent: Optional[float] = Field(description="Percent of sum assured or fund value, when stated that way")
    kind: Literal["survival_benefit", "maturity", "annuity", "child_milestone"]
    guaranteed: bool
    note: str


class Extraction(BaseModel):
    policy: ExtractedPolicy
    payouts: list[Payout]
    caveats: list[str] = Field(description="Anything ambiguous or derived rather than printed, e.g. a vesting date computed from vesting age")


class PlanPolicy(ExtractedPolicy):
    nickname: str
    policyNoLast4: Optional[str]


class Plan(BaseModel):
    policy: PlanPolicy
    payouts: list[Payout]
