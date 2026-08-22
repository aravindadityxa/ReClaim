from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum
import json


class OpportunityType(str, enum.Enum):
    PAYMENT_FAILURE = "PAYMENT_FAILURE"
    SUBSCRIPTION_FAILURE = "SUBSCRIPTION_FAILURE"
    CHECKOUT_ABANDONMENT = "CHECKOUT_ABANDONMENT"
    INVOICE_DELAY = "INVOICE_DELAY"


class OpportunityStatus(str, enum.Enum):
    AT_RISK = "AT_RISK"
    RECOVERABLE = "RECOVERABLE"
    RECOVERED = "RECOVERED"
    LOST = "LOST"
    MONITORING = "MONITORING"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Recoverability(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TransactionStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"


class RecoveryState(str, enum.Enum):
    """Phase 4: Recovery workflow states."""
    DETECTED = "DETECTED"
    PLANNED = "PLANNED"
    READY = "READY"
    EXECUTING = "EXECUTING"
    WAITING = "WAITING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    REPLANNING = "REPLANNING"
    STOPPED = "STOPPED"
    RECOVERED = "RECOVERED"
    LOST = "LOST"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="customer")
    opportunities = relationship("RevenueOpportunity", back_populates="customer")
    recovery_attempts = relationship("RecoveryAttempt", back_populates="customer")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True)
    amount = Column(Float)
    currency = Column(String, default="INR")
    status = Column(Enum(TransactionStatus), index=True)
    payment_method = Column(String)
    failure_reason = Column(String, nullable=True)
    created_at = Column(DateTime, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="transactions")
    opportunity = relationship("RevenueOpportunity", back_populates="transaction", uselist=False)


class RevenueOpportunity(Base):
    __tablename__ = "revenue_opportunities"

    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True)
    amount = Column(Float)
    currency = Column(String, default="INR")
    type = Column(Enum(OpportunityType), index=True)
    status = Column(Enum(OpportunityStatus), index=True)
    risk_level = Column(Enum(RiskLevel), index=True)
    recoverability = Column(Enum(Recoverability), index=True)
    failure_reason = Column(String, nullable=True)
    source = Column(String)
    created_at = Column(DateTime, index=True)
    due_at = Column(DateTime, nullable=True)
    recovered_at = Column(DateTime, nullable=True)

    transaction = relationship("Transaction", back_populates="opportunity")
    customer = relationship("Customer", back_populates="opportunities")
    recovery_attempts = relationship("RecoveryAttempt", back_populates="opportunity")


class RecoveryAttempt(Base):
    """Phase 4: Record of a recovery action attempt."""
    __tablename__ = "recovery_attempts"

    id = Column(String, primary_key=True, index=True)
    opportunity_id = Column(String, ForeignKey("revenue_opportunities.id"), index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True)
    action_type = Column(String, index=True)
    attempt_number = Column(Integer)
    execution_id = Column(String, index=True)
    state_before = Column(Enum(RecoveryState))
    state_after = Column(Enum(RecoveryState))
    result = Column(String)  # SUCCEEDED, FAILED, UNKNOWN, DUPLICATE
    provider_reference = Column(String, nullable=True)
    error_code = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    expected_value = Column(Float, nullable=True)
    expected_recovery = Column(Float, nullable=True)
    created_at = Column(DateTime, index=True, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    opportunity = relationship("RevenueOpportunity", back_populates="recovery_attempts")
    customer = relationship("Customer", back_populates="recovery_attempts")


class RecoveryExecution(Base):
    """Phase 4: Track recovery workflow execution."""
    __tablename__ = "recovery_executions"

    id = Column(String, primary_key=True, index=True)
    opportunity_id = Column(String, ForeignKey("revenue_opportunities.id"), index=True)
    current_state = Column(Enum(RecoveryState), index=True)
    current_action = Column(String, nullable=True)
    attempt_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    customer_contact_count = Column(Integer, default=0)
    plan = Column(String, nullable=True)  # JSON string
    stopping_reason = Column(String, nullable=True)
    final_status = Column(String, nullable=True)  # RECOVERED, LOST, FAILED, STOPPED
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
