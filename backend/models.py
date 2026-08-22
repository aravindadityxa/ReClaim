from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


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


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="customer")
    opportunities = relationship("RevenueOpportunity", back_populates="customer")


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
