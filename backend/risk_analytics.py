"""Risk intelligence analytics and calculations."""

from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, List, Tuple
import pandas as pd

from models import RevenueOpportunity, Transaction, Customer, OpportunityStatus
from risk_features import RiskFeatureEngine
from risk_model import RiskModel, RiskScorer


class RiskAnalytics:
    """Compute risk intelligence metrics."""

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self.risk_model = RiskModel()
        self.feature_engine = RiskFeatureEngine()
        self.scorer = RiskScorer()
        self._features_cache = None  # Cache features within a request
        self._features_cache_db_id = None  # Track which db session this was built for
        self._ensure_model_trained()

    def _ensure_model_trained(self):
        """Ensure risk model is trained and available."""
        try:
            self.risk_model.load()
        except FileNotFoundError:
            # Train model on first use
            df = self.feature_engine.build_opportunity_features(self.db)
            if len(df) > 0:
                self.risk_model.train(df)

    def _get_cached_features(self) -> any:
        """Get cached features for current db session. Rebuilds if session changed."""
        # If db session changed, invalidate cache
        if self._features_cache is None or self._features_cache_db_id != id(self.db):
            self._features_cache = self.feature_engine.build_opportunity_features(self.db)
            self._features_cache_db_id = id(self.db)
        return self._features_cache

    def compute_opportunity_risk(self, opportunity_id: str) -> Dict:
        """
        Compute comprehensive risk analysis for a single opportunity.
        
        Returns dict with:
        - risk_probability
        - risk_score
        - risk_level
        - expected_loss
        - recoverability_score
        - priority_score
        - risk_drivers
        - confidence
        - model_info
        """
        opp = self.db.query(RevenueOpportunity).filter(
            RevenueOpportunity.id == opportunity_id
        ).first()

        if not opp:
            return None

        # Use cached features instead of rebuilding for each opportunity
        df = self._get_cached_features()
        opp_row = df[df['opportunity_id'] == opportunity_id]

        if opp_row.empty:
            return None

        # Get risk probability from model
        try:
            risk_probability = float(self.risk_model.predict_proba(opp_row)[0])
        except Exception:
            # Fall back to deterministic if model fails
            risk_probability = self._baseline_risk_probability(opp)

        # Convert to score and level
        risk_score = self.scorer.probability_to_score(risk_probability)
        risk_level = self.scorer.score_to_level(risk_score)

        # Calculate expected loss
        expected_loss = self.scorer.calculate_expected_loss(opp.amount, risk_probability)

        # Compute recoverability score
        recoverability_score = self._compute_recoverability_score(opp)

        # Calculate priority
        opp_age_days = (datetime.utcnow() - opp.created_at).days
        priority_score = self.scorer.calculate_priority_score(
            opp.amount,
            risk_probability,
            recoverability_score,
            opp_age_days
        )

        # Extract risk drivers
        risk_drivers = self._extract_risk_drivers(opp, opp_row, risk_probability)

        # Model confidence
        confidence = self._estimate_confidence(len(df))

        return {
            "opportunity_id": opportunity_id,
            "risk_probability": round(risk_probability, 3),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "expected_loss": round(expected_loss, 2),
            "recoverability_score": recoverability_score,
            "priority_score": int(priority_score),
            "risk_drivers": risk_drivers,
            "confidence": confidence,
            "model_info": {
                "model_type": "LogisticRegression",
                "model_status": "trained" if self.risk_model.model else "unavailable",
                "training_timestamp": self.risk_model.metadata.get("training_timestamp") if self.risk_model.metadata else None,
            },
            "computed_at": datetime.utcnow().isoformat(),
        }

    def compute_all_opportunities_risk(self) -> List[Dict]:
        """Compute risk for all opportunities."""
        opportunities = self.db.query(RevenueOpportunity).all()
        results = []

        for opp in opportunities:
            risk = self.compute_opportunity_risk(opp.id)
            if risk:
                results.append(risk)

        return results

    def get_risk_queue(self, limit: int = 20) -> List[Dict]:
        """Get top opportunities sorted by priority."""
        all_risks = self.compute_all_opportunities_risk()
        
        # Sort by priority score descending
        sorted_risks = sorted(all_risks, key=lambda x: x['priority_score'], reverse=True)
        
        return sorted_risks[:limit]

    def get_risk_summary(self) -> Dict:
        """Get aggregated risk summary metrics."""
        risks = self.compute_all_opportunities_risk()

        if not risks:
            return {
                "high_risk_revenue": 0.0,
                "high_risk_opportunity_count": 0,
                "total_expected_loss": 0.0,
                "average_risk_score": 0,
                "most_common_risk_driver": None,
                "critical_opportunity_count": 0,
                "model_performance": self.risk_model.metadata.get("f1", 0) if self.risk_model.metadata else 0,
            }

        high_risk_opps = [r for r in risks if r['risk_level'] in ['HIGH', 'CRITICAL']]
        critical_opps = [r for r in risks if r['risk_level'] == 'CRITICAL']

        high_risk_revenue = sum(r['expected_loss'] for r in high_risk_opps)
        total_expected_loss = sum(r['expected_loss'] for r in risks)

        # Most common risk driver
        driver_counts = {}
        for r in risks:
            if r['risk_drivers']:
                main_driver = r['risk_drivers'][0] if isinstance(r['risk_drivers'], list) else r['risk_drivers']
                driver_counts[main_driver] = driver_counts.get(main_driver, 0) + 1

        most_common_driver = max(driver_counts, key=driver_counts.get) if driver_counts else None

        return {
            "high_risk_revenue": round(high_risk_revenue, 2),
            "high_risk_opportunity_count": len(high_risk_opps),
            "total_expected_loss": round(total_expected_loss, 2),
            "average_risk_score": int(sum(r['risk_score'] for r in risks) / len(risks)) if risks else 0,
            "most_common_risk_driver": most_common_driver,
            "critical_opportunity_count": len(critical_opps),
            "model_performance_f1": self.risk_model.metadata.get("f1", 0) if self.risk_model.metadata else 0,
        }

    def get_risk_drivers_breakdown(self) -> Dict:
        """Get breakdown of risk by driver."""
        opportunities = self.db.query(RevenueOpportunity).all()
        risks = self.compute_all_opportunities_risk()

        driver_stats = {}

        for opp, risk in zip(opportunities, risks):
            drivers = risk.get('risk_drivers', [])
            
            for driver in drivers:
                if driver not in driver_stats:
                    driver_stats[driver] = {
                        "driver": driver,
                        "affected_opportunities": 0,
                        "revenue_at_risk": 0.0,
                        "average_risk_score": 0,
                        "recoverable_revenue": 0.0,
                        "risk_scores": []
                    }

                driver_stats[driver]["affected_opportunities"] += 1
                driver_stats[driver]["revenue_at_risk"] += risk["expected_loss"]
                driver_stats[driver]["risk_scores"].append(risk["risk_score"])
                driver_stats[driver]["recoverable_revenue"] += (
                    risk["expected_loss"] * (risk["recoverability_score"] / 100.0)
                )

        # Calculate averages
        for driver in driver_stats:
            scores = driver_stats[driver]["risk_scores"]
            driver_stats[driver]["average_risk_score"] = int(sum(scores) / len(scores)) if scores else 0
            del driver_stats[driver]["risk_scores"]

        # Sort by revenue at risk
        sorted_drivers = sorted(
            driver_stats.values(),
            key=lambda x: x["revenue_at_risk"],
            reverse=True
        )

        return sorted_drivers

    def get_cohort_risk(self, dimension: str) -> Dict:
        """
        Get risk breakdown by cohort dimension.
        
        Dimensions:
        - payment_method
        - failure_reason
        - opportunity_type
        """
        opportunities = self.db.query(RevenueOpportunity).all()
        risks = self.compute_all_opportunities_risk()

        cohort_stats = {}

        for opp, risk in zip(opportunities, risks):
            if dimension == "payment_method":
                cohort_key = opp.transaction.payment_method
            elif dimension == "failure_reason":
                cohort_key = opp.transaction.failure_reason or "unknown"
            elif dimension == "opportunity_type":
                cohort_key = opp.type.value
            else:
                continue

            if cohort_key not in cohort_stats:
                cohort_stats[cohort_key] = {
                    "cohort": cohort_key,
                    "opportunity_count": 0,
                    "revenue_at_risk": 0.0,
                    "average_risk_score": 0,
                    "risk_scores": [],
                    "average_recoverability": 0,
                    "recoverabilities": []
                }

            cohort_stats[cohort_key]["opportunity_count"] += 1
            cohort_stats[cohort_key]["revenue_at_risk"] += risk["expected_loss"]
            cohort_stats[cohort_key]["risk_scores"].append(risk["risk_score"])
            cohort_stats[cohort_key]["recoverabilities"].append(risk["recoverability_score"])

        # Calculate averages
        for cohort in cohort_stats:
            scores = cohort_stats[cohort]["risk_scores"]
            recovs = cohort_stats[cohort]["recoverabilities"]
            cohort_stats[cohort]["average_risk_score"] = int(sum(scores) / len(scores)) if scores else 0
            cohort_stats[cohort]["average_recoverability"] = int(sum(recovs) / len(recovs)) if recovs else 0
            del cohort_stats[cohort]["risk_scores"]
            del cohort_stats[cohort]["recoverabilities"]

        # Sort by revenue at risk
        sorted_cohorts = sorted(
            cohort_stats.values(),
            key=lambda x: x["revenue_at_risk"],
            reverse=True
        )

        return sorted_cohorts

    def get_risk_trend(self, days: int = 30) -> List[Dict]:
        """Get risk trend over time."""
        from datetime import timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        opportunities = self.db.query(RevenueOpportunity).filter(
            RevenueOpportunity.created_at >= start_date
        ).all()

        risks = {}
        
        for opp in opportunities:
            date_key = opp.created_at.date().isoformat()
            
            if date_key not in risks:
                risks[date_key] = {
                    "date": date_key,
                    "opportunity_count": 0,
                    "revenue_at_risk": 0.0,
                    "average_risk_score": 0,
                    "risk_scores": []
                }

            risk_info = self.compute_opportunity_risk(opp.id)
            if risk_info:
                risks[date_key]["opportunity_count"] += 1
                risks[date_key]["revenue_at_risk"] += risk_info["expected_loss"]
                risks[date_key]["risk_scores"].append(risk_info["risk_score"])

        # Calculate averages and remove score list
        result = []
        for date_key in sorted(risks.keys()):
            entry = risks[date_key]
            scores = entry["risk_scores"]
            entry["average_risk_score"] = int(sum(scores) / len(scores)) if scores else 0
            del entry["risk_scores"]
            result.append(entry)

        return result

    def detect_risk_spikes(self, days: int = 7) -> Dict:
        """Detect unusual increases in risk."""
        from datetime import timedelta
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Recent period
        recent_opps = self.db.query(RevenueOpportunity).filter(
            RevenueOpportunity.created_at >= start_date
        ).all()
        
        # Earlier period for comparison
        earlier_start = start_date - timedelta(days=days)
        earlier_opps = self.db.query(RevenueOpportunity).filter(
            RevenueOpportunity.created_at >= earlier_start,
            RevenueOpportunity.created_at < start_date
        ).all()

        recent_count = len(recent_opps)
        earlier_count = len(earlier_opps)

        spike_detected = False
        magnitude = 0.0

        if earlier_count > 0:
            magnitude = (recent_count - earlier_count) / earlier_count
            spike_detected = magnitude > 0.2  # 20% increase

        return {
            "spike_detected": spike_detected,
            "magnitude": round(magnitude, 2),
            "period_days": days,
            "recent_opportunities": recent_count,
            "baseline_opportunities": earlier_count,
            "change_percentage": round(magnitude * 100, 1),
        }

    def _baseline_risk_probability(self, opp: RevenueOpportunity) -> float:
        """Fallback deterministic risk probability."""
        risk_level_map = {"LOW": 0.1, "MEDIUM": 0.4, "HIGH": 0.7, "CRITICAL": 0.9}
        return risk_level_map.get(opp.risk_level.value, 0.5)

    def _compute_recoverability_score(self, opp: RevenueOpportunity) -> int:
        """Convert recoverability classification to 0-100 score."""
        recov_map = {"LOW": 25, "MEDIUM": 55, "HIGH": 85}
        return recov_map.get(opp.recoverability.value, 50)

    def _extract_risk_drivers(self, opp: RevenueOpportunity, feature_row: pd.DataFrame, risk_prob: float) -> List[str]:
        """Extract main risk drivers for an opportunity."""
        drivers = []
        
        # Check feature values to identify drivers
        row = feature_row.iloc[0]

        if row.get('is_authorization_failure'):
            drivers.append("Payment authorization failure")
        
        if row.get('is_insufficient_funds'):
            drivers.append("Insufficient funds")
        
        if row.get('is_checkout_abandon'):
            drivers.append("Checkout abandonment")
        
        if row.get('is_subscription_failure'):
            drivers.append("Subscription renewal failure")
        
        if row.get('customer_fail_rate', 0) > 0.3:
            drivers.append("High customer failure rate")
        
        if row.get('is_aging_opp'):
            drivers.append("Opportunity aging")
        
        if row.get('customer_recovery_rate', 0) < 0.3:
            drivers.append("Low customer recovery history")
        
        # Limit to top 3 drivers
        return drivers[:3] if drivers else ["Unclassified risk"]

    def _estimate_confidence(self, sample_size: int) -> float:
        """Estimate model confidence based on training sample size."""
        # More samples = higher confidence
        # Min confidence is 0.4 (when very few samples)
        # Max confidence is 0.95 (when many samples)
        confidence = min(0.95, 0.4 + (sample_size / 100.0) * 0.55)
        return round(confidence, 2)
