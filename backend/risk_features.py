"""Feature engineering for risk intelligence."""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np

from models import (
    Transaction, RevenueOpportunity, Customer,
    TransactionStatus, OpportunityStatus
)


class RiskFeatureEngine:
    """Extract features for risk modeling."""

    @staticmethod
    def build_opportunity_features(db: Session) -> pd.DataFrame:
        """
        Build feature matrix for revenue opportunities.
        
        Returns DataFrame with opportunity-level features.
        """
        from sqlalchemy.orm import joinedload
        opportunities = db.query(RevenueOpportunity).options(
            joinedload(RevenueOpportunity.transaction),
            joinedload(RevenueOpportunity.customer)
        ).all()
        
        if not opportunities:
            return pd.DataFrame()

        features = []
        now = datetime.utcnow()

        for opp in opportunities:
            # Transaction features
            txn = opp.transaction
            customer = opp.customer
            
            # Age features
            opp_age_days = (now - opp.created_at).days
            txn_age_days = (now - txn.created_at).days
            
            # Customer historical features
            customer_transactions = db.query(Transaction).filter(
                Transaction.customer_id == customer.id
            ).all()
            
            customer_failed_count = sum(
                1 for t in customer_transactions
                if t.status == TransactionStatus.FAILED
            )
            customer_success_count = sum(
                1 for t in customer_transactions
                if t.status == TransactionStatus.SUCCESS
            )
            
            customer_total_amount = sum(t.amount for t in customer_transactions)
            customer_failed_amount = sum(
                t.amount for t in customer_transactions
                if t.status == TransactionStatus.FAILED
            )
            
            # Customer opportunity features
            customer_opportunities = db.query(RevenueOpportunity).filter(
                RevenueOpportunity.customer_id == customer.id
            ).all()
            
            customer_recovered_opps = sum(
                1 for o in customer_opportunities
                if o.status == OpportunityStatus.RECOVERED
            )
            customer_lost_opps = sum(
                1 for o in customer_opportunities
                if o.status == OpportunityStatus.LOST
            )
            
            customer_recovery_rate = (
                customer_recovered_opps / max(1, len(customer_opportunities))
                if customer_opportunities else 0.5
            )
            
            # Time-based features
            transaction_hour = txn.created_at.hour
            transaction_dow = txn.created_at.weekday()
            
            # Failure pattern features
            failure_reason = txn.failure_reason or ""
            is_authorization_failure = any(
                keyword in failure_reason.lower()
                for keyword in ["card declined", "authorization", "invalid"]
            )
            is_insufficient_funds = "insufficient" in failure_reason.lower()
            is_checkout_abandon = "checkout" in failure_reason.lower() or "abandoned" in failure_reason.lower()
            is_subscription_failure = "subscription" in failure_reason.lower()
            
            # Amount features
            amount_log = np.log1p(opp.amount)
            is_high_amount = opp.amount > 5000
            is_low_amount = opp.amount < 500
            
            # Status/classification features
            is_recoverable_classification = opp.recoverability.value == "HIGH"
            is_medium_recov = opp.recoverability.value == "MEDIUM"
            
            feature_row = {
                "opportunity_id": opp.id,
                "amount": opp.amount,
                "amount_log": amount_log,
                "is_high_amount": int(is_high_amount),
                "is_low_amount": int(is_low_amount),
                
                # Opportunity features
                "opp_age_days": opp_age_days,
                "is_new_opp": int(opp_age_days <= 7),
                "is_aging_opp": int(opp_age_days > 30),
                
                # Transaction features
                "txn_age_days": txn_age_days,
                "transaction_hour": transaction_hour,
                "transaction_dow": transaction_dow,
                
                # Failure type features
                "is_authorization_failure": int(is_authorization_failure),
                "is_insufficient_funds": int(is_insufficient_funds),
                "is_checkout_abandon": int(is_checkout_abandon),
                "is_subscription_failure": int(is_subscription_failure),
                
                # Customer historical features
                "customer_transaction_count": len(customer_transactions),
                "customer_success_count": customer_success_count,
                "customer_failed_count": customer_failed_count,
                "customer_fail_rate": customer_failed_count / max(1, len(customer_transactions)),
                "customer_avg_transaction_value": customer_total_amount / max(1, len(customer_transactions)),
                "customer_failed_amount": customer_failed_amount,
                
                # Customer opportunity features
                "customer_opp_count": len(customer_opportunities),
                "customer_recovered_opps": customer_recovered_opps,
                "customer_lost_opps": customer_lost_opps,
                "customer_recovery_rate": customer_recovery_rate,
                
                # Classification features
                "is_recoverable_classification": int(is_recoverable_classification),
                "is_medium_recov": int(is_medium_recov),
                
                # Target (for training)
                "target_lost": int(opp.status == OpportunityStatus.LOST),
                "target_recovered": int(opp.status == OpportunityStatus.RECOVERED),
                
                # Metadata
                "status": opp.status.value,
                "type": opp.type.value,
                "failure_reason": txn.failure_reason or "unknown",
                "customer_id": customer.id,
                "created_at": opp.created_at.isoformat(),
            }
            
            features.append(feature_row)

        df = pd.DataFrame(features)
        return df

    @staticmethod
    def get_feature_names() -> list:
        """Get list of feature names used for modeling."""
        return [
            "amount",
            "amount_log",
            "is_high_amount",
            "is_low_amount",
            "opp_age_days",
            "is_new_opp",
            "is_aging_opp",
            "txn_age_days",
            "transaction_hour",
            "transaction_dow",
            "is_authorization_failure",
            "is_insufficient_funds",
            "is_checkout_abandon",
            "is_subscription_failure",
            "customer_transaction_count",
            "customer_success_count",
            "customer_failed_count",
            "customer_fail_rate",
            "customer_avg_transaction_value",
            "customer_failed_amount",
            "customer_opp_count",
            "customer_recovered_opps",
            "customer_lost_opps",
            "customer_recovery_rate",
            "is_recoverable_classification",
            "is_medium_recov",
        ]

    @staticmethod
    def get_feature_descriptions() -> dict:
        """Get descriptions of each feature for explainability."""
        return {
            "amount": "Opportunity amount in INR",
            "amount_log": "Log-transformed amount",
            "is_high_amount": "Whether amount > 5000 INR",
            "is_low_amount": "Whether amount < 500 INR",
            "opp_age_days": "Days since opportunity created",
            "is_new_opp": "Whether opportunity <= 7 days old",
            "is_aging_opp": "Whether opportunity > 30 days old",
            "txn_age_days": "Days since transaction created",
            "transaction_hour": "Hour of transaction (0-23)",
            "transaction_dow": "Day of week (0=Monday, 6=Sunday)",
            "is_authorization_failure": "Whether failure is authorization-related",
            "is_insufficient_funds": "Whether failure is insufficient funds",
            "is_checkout_abandon": "Whether failure is checkout abandonment",
            "is_subscription_failure": "Whether failure is subscription-related",
            "customer_transaction_count": "Total transactions for this customer",
            "customer_success_count": "Successful transactions for customer",
            "customer_failed_count": "Failed transactions for customer",
            "customer_fail_rate": "Failure rate for this customer",
            "customer_avg_transaction_value": "Average transaction value for customer",
            "customer_failed_amount": "Total failed amount for customer",
            "customer_opp_count": "Total opportunities for this customer",
            "customer_recovered_opps": "Recovered opportunities for customer",
            "customer_lost_opps": "Lost opportunities for customer",
            "customer_recovery_rate": "Historical recovery rate for customer",
            "is_recoverable_classification": "Recoverability classification (HIGH)",
            "is_medium_recov": "Recoverability classification (MEDIUM)",
        }
