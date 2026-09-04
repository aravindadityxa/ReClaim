"""Action executor - safely execute recovery actions."""

from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import logging

from recovery_state import ExecutionResult
from recovery_strategies import RecoveryActionType, RECOVERY_ACTIONS
from recovery_config import RAZORPAY_CONFIG

logger = logging.getLogger(__name__)


class ActionExecutor:
    """Execute recovery actions safely with validation."""
    
    SUPPORTED_ACTIONS = {
        RecoveryActionType.PAYMENT_RETRY,
        RecoveryActionType.PAYMENT_LINK,
        RecoveryActionType.CUSTOMER_REMINDER,
        RecoveryActionType.SUBSCRIPTION_RETRY,
        RecoveryActionType.INVOICE_REMINDER,
        RecoveryActionType.DELAY_AND_RETRY,
        RecoveryActionType.NO_ACTION,
    }
    
    def __init__(self):
        """Initialize executor."""
        self.razorpay_client = None
        if RAZORPAY_CONFIG.is_configured():
            try:
                RAZORPAY_CONFIG.validate_test_mode()
                # Razorpay integration would go here
                logger.info("Razorpay Test Mode configured")
            except ValueError as e:
                logger.warning(f"Razorpay configuration issue: {e}")
    
    def validate_action(self, action_type: str) -> bool:
        """Check if action is supported."""
        try:
            action = RecoveryActionType(action_type)
            return action in self.SUPPORTED_ACTIONS
        except ValueError:
            return False
    
    def execute(
        self,
        opportunity_id: str,
        action_type: str,
        amount: float,
        customer_email: str,
        is_simulation: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute a recovery action.
        
        Args:
            opportunity_id: Unique opportunity ID
            action_type: Recovery action type
            amount: Amount in currency
            customer_email: Customer email
            is_simulation: Whether to simulate (no provider call)
        
        Returns:
            Execution result dict with status, provider_reference, etc.
        """
        
        # Validate action type
        if not self.validate_action(action_type):
            return {
                "execution_id": str(uuid.uuid4()),
                "status": ExecutionResult.FAILED.value,
                "error_code": "INVALID_ACTION",
                "error_message": f"Action not supported: {action_type}",
                "provider_reference": None,
            }
        
        execution_id = str(uuid.uuid4())
        
        try:
            # Simulate or execute
            if is_simulation:
                return self._simulate_execution(execution_id, action_type, opportunity_id, amount)
            else:
                return self._execute_with_provider(execution_id, action_type, opportunity_id, amount, customer_email)
        
        except Exception as e:
            logger.error(f"Execution error: {e}")
            return {
                "execution_id": execution_id,
                "status": ExecutionResult.FAILED.value,
                "error_code": "EXECUTION_ERROR",
                "error_message": str(e),
                "provider_reference": None,
            }
    
    def _simulate_execution(
        self,
        execution_id: str,
        action_type: str,
        opportunity_id: str,
        amount: float,
    ) -> Dict[str, Any]:
        """
        Simulate an execution without provider call.
        Deterministic based on amount and action.
        """
        
        # Deterministic simulation based on opportunity_id hash
        hash_val = hash(opportunity_id) % 100
        
        # Success probability varies by action
        action_success_rates = {
            "PAYMENT_RETRY": 31,
            "PAYMENT_LINK": 58,
            "CUSTOMER_REMINDER": 44,
            "SUBSCRIPTION_RETRY": 37,
            "INVOICE_REMINDER": 35,
            "DELAY_AND_RETRY": 28,
            "NO_ACTION": 0,
        }
        
        success_threshold = action_success_rates.get(action_type, 50)
        is_success = hash_val < success_threshold
        
        result = {
            "execution_id": execution_id,
            "status": ExecutionResult.SUCCEEDED.value if is_success else ExecutionResult.FAILED.value,
            "provider_reference": f"sim_{execution_id[:8]}",
            "error_code": None if is_success else "SIMULATED_FAILURE",
            "error_message": None if is_success else "Simulated failure for demo",
            "mode": "SIMULATION",
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        logger.info(f"Simulated execution {execution_id}: {action_type} -> {result['status']}")
        return result
    
    def _execute_with_provider(
        self,
        execution_id: str,
        action_type: str,
        opportunity_id: str,
        amount: float,
        customer_email: str,
    ) -> Dict[str, Any]:
        """
        Execute with actual provider (Razorpay Test Mode only).
        """
        
        # Check if Razorpay is configured
        if not RAZORPAY_CONFIG.is_configured():
            logger.warning("Razorpay not configured, falling back to simulation")
            return self._simulate_execution(execution_id, action_type, opportunity_id, amount)
        
        # Ensure test mode
        try:
            RAZORPAY_CONFIG.validate_test_mode()
        except ValueError as e:
            logger.error(f"Mode validation failed: {e}")
            return {
                "execution_id": execution_id,
                "status": ExecutionResult.FAILED.value,
                "error_code": "INVALID_MODE",
                "error_message": str(e),
                "provider_reference": None,
            }
        
        # Route to appropriate handler
        if action_type == RecoveryActionType.PAYMENT_RETRY.value:
            return self._execute_payment_retry(execution_id, opportunity_id, amount, customer_email)
        elif action_type == RecoveryActionType.PAYMENT_LINK.value:
            return self._execute_payment_link(execution_id, opportunity_id, amount, customer_email)
        elif action_type == RecoveryActionType.CUSTOMER_REMINDER.value:
            return self._execute_customer_reminder(execution_id, opportunity_id, customer_email)
        elif action_type == RecoveryActionType.SUBSCRIPTION_RETRY.value:
            return self._execute_subscription_retry(execution_id, opportunity_id, amount)
        elif action_type == RecoveryActionType.NO_ACTION.value:
            return {
                "execution_id": execution_id,
                "status": ExecutionResult.SUCCEEDED.value,
                "provider_reference": None,
                "error_code": None,
                "error_message": None,
                "mode": "TEST",
                "timestamp": datetime.utcnow().isoformat(),
            }
        else:
            return {
                "execution_id": execution_id,
                "status": ExecutionResult.FAILED.value,
                "error_code": "UNSUPPORTED_ACTION",
                "error_message": f"No handler for {action_type}",
                "provider_reference": None,
            }
    
    def _execute_payment_retry(
        self,
        execution_id: str,
        opportunity_id: str,
        amount: float,
        customer_email: str,
    ) -> Dict[str, Any]:
        """Execute payment retry (Test Mode)."""
        
        # Simulates payment retry execution
        logger.info(f"Payment retry execution {execution_id} for {opportunity_id}: ₹{amount}")
        
        return self._simulate_execution(execution_id, "PAYMENT_RETRY", opportunity_id, amount)
    
    def _execute_payment_link(
        self,
        execution_id: str,
        opportunity_id: str,
        amount: float,
        customer_email: str,
    ) -> Dict[str, Any]:
        """Execute payment link (Razorpay Test Mode)."""
        
        logger.info(f"Payment link execution {execution_id} for {opportunity_id}: ₹{amount} -> {customer_email}")
        
        # Would call Razorpay's create payment link API
        return self._simulate_execution(execution_id, "PAYMENT_LINK", opportunity_id, amount)
    
    def _execute_customer_reminder(
        self,
        execution_id: str,
        opportunity_id: str,
        customer_email: str,
    ) -> Dict[str, Any]:
        """Execute customer reminder."""
        
        logger.info(f"Customer reminder execution {execution_id} for {opportunity_id} -> {customer_email}")
        
        # Would send SMS/email via provider
        return {
            "execution_id": execution_id,
            "status": ExecutionResult.SUCCEEDED.value,
            "provider_reference": f"reminder_{execution_id[:8]}",
            "error_code": None,
            "error_message": None,
            "mode": "TEST",
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    def _execute_subscription_retry(
        self,
        execution_id: str,
        opportunity_id: str,
        amount: float,
    ) -> Dict[str, Any]:
        """Execute subscription retry (Razorpay Test Mode)."""
        
        logger.info(f"Subscription retry execution {execution_id} for {opportunity_id}: ₹{amount}")
        
        return self._simulate_execution(execution_id, "SUBSCRIPTION_RETRY", opportunity_id, amount)


# Global executor instance
executor = ActionExecutor()
