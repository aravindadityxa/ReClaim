"""Next Best Time calculation for recovery actions."""

from datetime import datetime, timedelta
from typing import Tuple
from models import RevenueOpportunity, OpportunityType
from recovery_models import NextBestTime


class TimingEngine:
    """Calculate recommended timing for recovery actions."""
    
    def calculate_timing(
        self,
        action_type: str,
        opportunity: RevenueOpportunity,
        previous_attempts: int = 0
    ) -> NextBestTime:
        """
        Calculate recommended timing for a recovery action.
        
        Args:
            action_type: Type of recovery action
            opportunity: RevenueOpportunity object
            previous_attempts: Number of previous attempts
            
        Returns:
            NextBestTime with recommended window
        """
        if action_type == "NO_ACTION":
            return self._timing_no_action()
        
        # Get base timing based on action type
        if action_type == "PAYMENT_RETRY":
            return self._timing_payment_retry(opportunity, previous_attempts)
        elif action_type == "PAYMENT_LINK":
            return self._timing_payment_link(opportunity, previous_attempts)
        elif action_type == "CUSTOMER_REMINDER":
            return self._timing_customer_reminder(opportunity, previous_attempts)
        elif action_type == "SUBSCRIPTION_RETRY":
            return self._timing_subscription_retry(opportunity, previous_attempts)
        elif action_type == "INVOICE_REMINDER":
            return self._timing_invoice_reminder(opportunity, previous_attempts)
        elif action_type == "DELAY_AND_RETRY":
            return self._timing_delay_and_retry(opportunity, previous_attempts)
        else:
            return self._timing_default(opportunity, previous_attempts)
    
    def _timing_no_action(self) -> NextBestTime:
        """Timing for NO_ACTION."""
        return NextBestTime(
            recommended_date="N/A",
            recommended_time_window_start="N/A",
            recommended_time_window_end="N/A",
            urgency_level="NONE",
            rationale="No action recommended"
        )
    
    def _timing_payment_retry(
        self,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Timing for PAYMENT_RETRY - retry soon."""
        now = datetime.utcnow()
        
        # First attempt: within 2 hours
        if previous_attempts == 0:
            retry_time = now + timedelta(hours=2)
        # Second attempt: next day
        elif previous_attempts == 1:
            retry_time = now + timedelta(days=1)
        # Third attempt: 2 days later
        else:
            retry_time = now + timedelta(days=2)
        
        date_str = retry_time.strftime("%Y-%m-%d")
        
        # Get best time window (when customer is likely active)
        time_window = self._get_customer_active_window(opportunity)
        
        urgency = "HIGH" if previous_attempts == 0 else "MEDIUM"
        
        return NextBestTime(
            recommended_date=date_str,
            recommended_time_window_start=time_window[0],
            recommended_time_window_end=time_window[1],
            urgency_level=urgency,
            rationale=f"Automatic retry attempt {previous_attempts + 1} of 3. Best performed during customer active hours."
        )
    
    def _timing_payment_link(
        self,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Timing for PAYMENT_LINK - give customer time to respond."""
        now = datetime.utcnow()
        
        # Send link tomorrow, giving customer time to notice
        link_send_time = now + timedelta(days=1)
        date_str = link_send_time.strftime("%Y-%m-%d")
        
        # Early morning or evening (when people check emails)
        time_window = ("09:00", "11:00")
        
        return NextBestTime(
            recommended_date=date_str,
            recommended_time_window_start=time_window[0],
            recommended_time_window_end=time_window[1],
            urgency_level="MEDIUM",
            rationale="Payment link provides customer flexibility. Recommended timing allows for email delivery and customer decision-making window."
        )
    
    def _timing_customer_reminder(
        self,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Timing for CUSTOMER_REMINDER - gentle touch."""
        now = datetime.utcnow()
        
        # First reminder: wait 3 days
        if previous_attempts == 0:
            reminder_time = now + timedelta(days=3)
        # Second reminder: wait 5 more days
        else:
            reminder_time = now + timedelta(days=5)
        
        date_str = reminder_time.strftime("%Y-%m-%d")
        
        # Best time for reminders: morning
        time_window = ("08:00", "10:00")
        
        urgency = "LOW" if previous_attempts == 0 else "VERY_LOW"
        
        return NextBestTime(
            recommended_date=date_str,
            recommended_time_window_start=time_window[0],
            recommended_time_window_end=time_window[1],
            urgency_level=urgency,
            rationale=f"Gentle reminder #{previous_attempts + 1}. Spaced out to minimize customer friction."
        )
    
    def _timing_subscription_retry(
        self,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Timing for SUBSCRIPTION_RETRY - follow renewal schedule."""
        now = datetime.utcnow()
        
        # Retry subscriptions on their natural renewal boundary
        if previous_attempts == 0:
            # First retry: next day
            retry_time = now + timedelta(days=1)
        elif previous_attempts == 1:
            # Second retry: 3 days
            retry_time = now + timedelta(days=3)
        else:
            # Later retries: weekly
            retry_time = now + timedelta(days=7)
        
        date_str = retry_time.strftime("%Y-%m-%d")
        time_window = ("00:01", "04:00")  # Quiet off-peak hours
        
        return NextBestTime(
            recommended_date=date_str,
            recommended_time_window_start=time_window[0],
            recommended_time_window_end=time_window[1],
            urgency_level="HIGH",
            rationale=f"Subscription retry #{previous_attempts + 1}. Performed during off-peak hours to minimize system load."
        )
    
    def _timing_invoice_reminder(
        self,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Timing for INVOICE_REMINDER - follow due date."""
        now = datetime.utcnow()
        
        # Use due_at if available, otherwise calculate
        if opportunity.due_at and opportunity.due_at > now:
            target_date = opportunity.due_at
        else:
            # If no due date, remind in 2 days
            target_date = now + timedelta(days=2)
        
        date_str = target_date.strftime("%Y-%m-%d")
        time_window = ("10:00", "12:00")
        
        return NextBestTime(
            recommended_date=date_str,
            recommended_time_window_start=time_window[0],
            recommended_time_window_end=time_window[1],
            urgency_level="MEDIUM",
            rationale="Invoice reminder timed before due date to provide adequate notice."
        )
    
    def _timing_delay_and_retry(
        self,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Timing for DELAY_AND_RETRY - strategic delay."""
        now = datetime.utcnow()
        
        # Delay strategies increase with attempts
        if previous_attempts == 0:
            # First delay: 5 days
            retry_time = now + timedelta(days=5)
        else:
            # Second delay: 7 days
            retry_time = now + timedelta(days=7)
        
        date_str = retry_time.strftime("%Y-%m-%d")
        time_window = self._get_customer_active_window(opportunity)
        
        return NextBestTime(
            recommended_date=date_str,
            recommended_time_window_start=time_window[0],
            recommended_time_window_end=time_window[1],
            urgency_level="LOW",
            rationale=f"Delayed retry #{previous_attempts + 1}. Allows customer time to resolve temporary issues."
        )
    
    def _timing_default(
        self,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Default timing fallback."""
        now = datetime.utcnow()
        action_time = now + timedelta(days=1)
        date_str = action_time.strftime("%Y-%m-%d")
        
        return NextBestTime(
            recommended_date=date_str,
            recommended_time_window_start="10:00",
            recommended_time_window_end="12:00",
            urgency_level="MEDIUM",
            rationale="Default timing applied. Recommended during business hours for optimal execution."
        )
    
    @staticmethod
    def _get_customer_active_window(opportunity: RevenueOpportunity) -> Tuple[str, str]:
        """
        Determine customer's likely active time window.
        
        In a production system, this would use:
        - Historical transaction times
        - Customer timezone
        - Application usage patterns
        - Customer preferences
        
        For now, use a reasonable default.
        """
        # TODO: Could use opportunity.transaction.created_at to infer customer timezone
        # Business hours window
        
        return ("14:00", "16:00")  # Mid-afternoon (reasonably broad window)
    
    @staticmethod
    def get_urgency_level(
        opportunity_age_days: int,
        risk_score: int,
        recoverability_score: int
    ) -> str:
        """
        Calculate urgency level based on opportunity characteristics.
        
        Args:
            opportunity_age_days: Days since opportunity creation
            risk_score: Risk score (0-100)
            recoverability_score: Recoverability score (0-100)
            
        Returns:
            Urgency level: CRITICAL, HIGH, MEDIUM, LOW, VERY_LOW
        """
        urgency_score = 0
        
        # Age factor (older = more urgent)
        urgency_score += min(opportunity_age_days * 2, 30)
        
        # Risk factor (higher risk = more urgent)
        urgency_score += risk_score * 0.3
        
        # Recoverability factor (less recoverable = less urgent)
        urgency_score -= (100 - recoverability_score) * 0.2
        
        # Classify
        if urgency_score >= 80:
            return "CRITICAL"
        elif urgency_score >= 60:
            return "HIGH"
        elif urgency_score >= 40:
            return "MEDIUM"
        elif urgency_score >= 20:
            return "LOW"
        else:
            return "VERY_LOW"
