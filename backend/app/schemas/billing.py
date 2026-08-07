from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


class QuotaResponse(BaseModel):
    """Everything the client needs to render the daily gauge and the paywall."""
    plan: str = Field(..., description='"free" or "pro"')
    spoken_seconds_used: int = Field(..., description="Speech metered today (UTC day)")
    spoken_seconds_limit: Optional[int] = Field(
        None, description="Daily allowance; null on Pro, which has no product limit"
    )
    resets_at: datetime = Field(..., description="Next UTC midnight")
    pro_price_monthly_eur: float
    pro_price_annual_eur: float


class UpgradeInterestRequest(BaseModel):
    """Measure-first: records that the user wants Pro at the shown price.

    Charges nothing — there is no billing integration yet on purpose.
    """
    plan_choice: Literal["monthly", "annual"]
