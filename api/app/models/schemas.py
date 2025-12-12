"""Pydantic models for request/response schemas."""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal


class AttackBase(BaseModel):
    """Base attack schema."""
    protocol_name: str
    attack_date: date
    attack_type: str
    loss_amount_usd: Decimal
    description: Optional[str] = None
    source_url: Optional[str] = None
    blockchain: Optional[str] = None
    data_source: str


class AttackCreate(AttackBase):
    """Schema for creating an attack."""
    pass


class Attack(AttackBase):
    """Schema for attack response."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttackResponse(BaseModel):
    """Response schema for attack list."""
    data: List[Attack]
    count: int


class SummaryStats(BaseModel):
    """Summary statistics schema."""
    total_attacks: int
    total_losses_usd: Decimal
    attacks_last_30_days: int
    losses_last_30_days: Decimal
    average_loss_per_attack: Decimal
    most_targeted_protocol: Optional[str] = None
    most_common_attack_type: Optional[str] = None


class TimelinePoint(BaseModel):
    """Timeline data point."""
    period: str
    attack_count: int
    total_loss_usd: Decimal


class TimelineResponse(BaseModel):
    """Timeline response."""
    timeline: List[TimelinePoint]


class ProtocolStats(BaseModel):
    """Protocol statistics."""
    protocol_name: str
    attack_count: int
    total_loss_usd: Decimal
    percentage: float


class ProtocolBreakdownResponse(BaseModel):
    """Protocol breakdown response."""
    protocols: List[ProtocolStats]


class AttackTypeStats(BaseModel):
    """Attack type statistics."""
    attack_type: str
    attack_count: int
    total_loss_usd: Decimal
    percentage: float


class AttackTypeBreakdownResponse(BaseModel):
    """Attack type breakdown response."""
    attack_types: List[AttackTypeStats]


class TopAttack(BaseModel):
    """Top attack schema."""
    protocol_name: str
    attack_date: date
    loss_amount_usd: Decimal
    attack_type: str
    description: Optional[str] = None
    source_url: Optional[str] = None


class TopAttacksResponse(BaseModel):
    """Top attacks response."""
    top_attacks: List[TopAttack]


class RefreshResponse(BaseModel):
    """Refresh operation response."""
    status: str
    message: str
    job_id: Optional[str] = None


class RefreshStatusResponse(BaseModel):
    """Refresh status response."""
    last_refresh: Optional[datetime] = None
    status: str
    records_fetched: Optional[int] = None
    next_scheduled_refresh: Optional[datetime] = None

