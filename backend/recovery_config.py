"""Recovery engine configuration and safety bounds."""

import os
from dataclasses import dataclass


@dataclass
class RecoveryBounds:
    """Hard limits for recovery execution."""
    max_recovery_attempts: int = 3
    max_customer_contacts: int = 2
    max_retry_count: int = 2
    min_expected_value: float = 100  # Minimum ₹100
    min_recovery_probability: float = 0.2  # 20% minimum
    max_plan_duration_days: int = 7
    max_action_timeout_seconds: int = 30
    
    def validate(self) -> None:
        """Validate bounds are reasonable."""
        assert self.max_recovery_attempts > 0, "max_recovery_attempts must be positive"
        assert self.max_customer_contacts > 0, "max_customer_contacts must be positive"
        assert self.max_retry_count >= 0, "max_retry_count must be non-negative"
        assert self.min_expected_value >= 0, "min_expected_value must be non-negative"
        assert 0 <= self.min_recovery_probability <= 1, "min_recovery_probability must be 0-1"
        assert self.max_plan_duration_days > 0, "max_plan_duration_days must be positive"
        assert self.max_action_timeout_seconds > 0, "max_action_timeout_seconds must be positive"


@dataclass
class RazorpayConfig:
    """Razorpay API configuration."""
    mode: str  # "test" or "production" - only "test" mode supported
    key_id: str
    key_secret: str
    base_url: str
    
    @staticmethod
    def from_env() -> 'RazorpayConfig':
        """Load from environment variables."""
        mode = os.getenv("RAZORPAY_MODE", "").lower()
        key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
        key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
        
        # Only test mode is supported
        if mode and mode not in ["test"]:
            raise ValueError(f"Invalid RAZORPAY_MODE: {mode}. Only 'test' mode is supported.")
        
        return RazorpayConfig(
            mode=mode or "test",
            key_id=key_id,
            key_secret=key_secret,
            base_url="https://api.razorpay.com/v1"
        )
    
    def is_configured(self) -> bool:
        """Check if Razorpay is properly configured."""
        return bool(self.key_id and self.key_secret)
    
    def validate_test_mode(self) -> None:
        """Ensure test mode is active."""
        if self.mode != "test":
            raise ValueError(f"Only test mode is supported. Current mode: {self.mode}")


# Global bounds instance
RECOVERY_BOUNDS = RecoveryBounds(
    max_recovery_attempts=int(os.getenv("MAX_RECOVERY_ATTEMPTS", "3")),
    max_customer_contacts=int(os.getenv("MAX_CUSTOMER_CONTACTS", "2")),
    max_retry_count=int(os.getenv("MAX_RETRY_COUNT", "2")),
    min_expected_value=float(os.getenv("MIN_EXPECTED_VALUE", "100")),
    min_recovery_probability=float(os.getenv("MIN_RECOVERY_PROBABILITY", "0.2")),
    max_plan_duration_days=int(os.getenv("MAX_PLAN_DURATION_DAYS", "7")),
    max_action_timeout_seconds=int(os.getenv("MAX_ACTION_TIMEOUT_SECONDS", "30")),
)

# Validate bounds
RECOVERY_BOUNDS.validate()

# Razorpay configuration
RAZORPAY_CONFIG = RazorpayConfig.from_env()
