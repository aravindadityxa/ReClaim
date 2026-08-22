"""Approval service - Manage approval requests and decisions."""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum
import uuid
import logging

logger = logging.getLogger(__name__)


class ApprovalStatus(str, Enum):
    """Status of an approval request."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ApprovalRequest:
    """Represents an approval request."""
    
    def __init__(
        self,
        id: str,
        opportunity_id: str,
        customer_id: str,
        action_type: str,
        amount: float,
        expected_value: float,
        recovery_probability: float,
        reason: str,
        requested_at: datetime,
        status: ApprovalStatus = ApprovalStatus.PENDING,
        expires_at: Optional[datetime] = None,
        reviewed_at: Optional[datetime] = None,
        reviewer_note: Optional[str] = None,
    ):
        """Initialize approval request."""
        self.id = id
        self.opportunity_id = opportunity_id
        self.customer_id = customer_id
        self.action_type = action_type
        self.amount = amount
        self.expected_value = expected_value
        self.recovery_probability = recovery_probability
        self.reason = reason
        self.requested_at = requested_at
        self.status = status
        self.expires_at = expires_at or (requested_at + timedelta(hours=24))
        self.reviewed_at = reviewed_at
        self.reviewer_note = reviewer_note
    
    def is_expired(self) -> bool:
        """Check if approval request is expired."""
        if self.status in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]:
            return False
        return datetime.utcnow() > self.expires_at
    
    def approve(self, reviewer_note: Optional[str] = None) -> bool:
        """Approve the request."""
        if self.is_expired():
            self.status = ApprovalStatus.EXPIRED
            return False
        if self.status != ApprovalStatus.PENDING:
            return False
        self.status = ApprovalStatus.APPROVED
        self.reviewed_at = datetime.utcnow()
        self.reviewer_note = reviewer_note
        logger.info(f"Approval request {self.id} APPROVED")
        return True
    
    def reject(self, reviewer_note: Optional[str] = None) -> bool:
        """Reject the request."""
        if self.status != ApprovalStatus.PENDING:
            return False
        self.status = ApprovalStatus.REJECTED
        self.reviewed_at = datetime.utcnow()
        self.reviewer_note = reviewer_note
        logger.info(f"Approval request {self.id} REJECTED")
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict."""
        return {
            "id": self.id,
            "opportunity_id": self.opportunity_id,
            "customer_id": self.customer_id,
            "action_type": self.action_type,
            "amount": self.amount,
            "expected_value": self.expected_value,
            "recovery_probability": self.recovery_probability,
            "reason": self.reason,
            "status": self.status.value,
            "requested_at": self.requested_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "reviewer_note": self.reviewer_note,
            "is_expired": self.is_expired(),
        }


class ApprovalQueue:
    """Queue of approval requests."""
    
    def __init__(self):
        """Initialize approval queue."""
        self.requests: Dict[str, ApprovalRequest] = {}
    
    def create_request(
        self,
        opportunity_id: str,
        customer_id: str,
        action_type: str,
        amount: float,
        expected_value: float,
        recovery_probability: float,
        reason: str,
    ) -> ApprovalRequest:
        """Create a new approval request."""
        request_id = str(uuid.uuid4())
        request = ApprovalRequest(
            id=request_id,
            opportunity_id=opportunity_id,
            customer_id=customer_id,
            action_type=action_type,
            amount=amount,
            expected_value=expected_value,
            recovery_probability=recovery_probability,
            reason=reason,
            requested_at=datetime.utcnow(),
        )
        self.requests[request_id] = request
        logger.info(f"Approval request created: {request_id} for {opportunity_id}")
        return request
    
    def get_request(self, request_id: str) -> Optional[ApprovalRequest]:
        """Get a specific approval request."""
        return self.requests.get(request_id)
    
    def approve(self, request_id: str, reviewer_note: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """Approve a request."""
        request = self.get_request(request_id)
        if not request:
            return False, "Request not found"
        if request.approve(reviewer_note):
            return True, None
        return False, f"Cannot approve request in status {request.status.value}"
    
    def reject(self, request_id: str, reviewer_note: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """Reject a request."""
        request = self.get_request(request_id)
        if not request:
            return False, "Request not found"
        if request.reject(reviewer_note):
            return True, None
        return False, f"Cannot reject request in status {request.status.value}"
    
    def get_pending(self) -> List[ApprovalRequest]:
        """Get all pending requests."""
        return [
            r for r in self.requests.values()
            if r.status == ApprovalStatus.PENDING and not r.is_expired()
        ]
    
    def get_expired_pending(self) -> List[ApprovalRequest]:
        """Get expired but still pending requests."""
        return [
            r for r in self.requests.values()
            if r.status == ApprovalStatus.PENDING and r.is_expired()
        ]
    
    def get_by_opportunity(self, opportunity_id: str) -> List[ApprovalRequest]:
        """Get all approval requests for an opportunity."""
        return [
            r for r in self.requests.values()
            if r.opportunity_id == opportunity_id
        ]
    
    def get_by_status(self, status: ApprovalStatus) -> List[ApprovalRequest]:
        """Get all requests with a specific status."""
        return [
            r for r in self.requests.values()
            if r.status == status
        ]
    
    def cleanup_expired(self) -> int:
        """Mark expired requests as EXPIRED. Returns count."""
        count = 0
        for request in self.get_expired_pending():
            request.status = ApprovalStatus.EXPIRED
            count += 1
        return count
    
    def get_summary(self) -> Dict[str, Any]:
        """Get approval queue summary."""
        self.cleanup_expired()
        pending = self.get_pending()
        approved = self.get_by_status(ApprovalStatus.APPROVED)
        rejected = self.get_by_status(ApprovalStatus.REJECTED)
        expired = self.get_by_status(ApprovalStatus.EXPIRED)
        
        return {
            "pending_count": len(pending),
            "approved_count": len(approved),
            "rejected_count": len(rejected),
            "expired_count": len(expired),
            "total_requests": len(self.requests),
            "pending_requests": [r.to_dict() for r in pending],
            "recently_approved": [r.to_dict() for r in approved[-5:]],
            "recently_rejected": [r.to_dict() for r in rejected[-5:]],
        }


# Global approval queue instance
approval_queue = ApprovalQueue()
