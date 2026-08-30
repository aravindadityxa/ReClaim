"""
Ollama LLM service for generating AI explanations.

This service is responsible for:
- Communicating with local Ollama instance
- Generating explanations for decisions made by deterministic engines
- Graceful fallback when Ollama is unavailable
- Never influencing financial decisions or risk calculations
"""

import logging
import requests
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

from config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_ENABLED, OLLAMA_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


@dataclass
class OllamaResponse:
    """Structured response from Ollama service."""
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None
    model: Optional[str] = None
    latency_ms: Optional[float] = None


class OllamaService:
    """Service for communicating with local Ollama instance."""
    
    def __init__(self):
        """Initialize Ollama service."""
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
        self.enabled = OLLAMA_ENABLED
        self.timeout = OLLAMA_TIMEOUT_SECONDS
        self._health_check_cache: Dict[str, Any] = {}
        self._cache_duration = timedelta(seconds=60)
        self._last_health_check: Optional[datetime] = None
    
    def is_available(self) -> bool:
        """
        Check if Ollama service is available.
        Cached for 60 seconds to avoid hammering the service.
        """
        if not self.enabled:
            return False
        
        # Check cache
        now = datetime.utcnow()
        if self._last_health_check and (now - self._last_health_check) < self._cache_duration:
            return self._health_check_cache.get("available", False)
        
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=2  # Health check should be fast
            )
            available = response.status_code == 200
            
            # Cache result
            self._health_check_cache["available"] = available
            self._last_health_check = now
            
            return available
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            self._health_check_cache["available"] = False
            self._last_health_check = now
            return False
    
    def generate_explanation(
        self,
        prompt: str,
        system_context: Optional[str] = None,
        max_tokens: int = 150
    ) -> OllamaResponse:
        """
        Generate an explanation using Ollama.
        
        Args:
            prompt: The prompt to send to the model
            system_context: Optional system context for the model
            max_tokens: Maximum tokens in response
            
        Returns:
            OllamaResponse with success status and generated text
        """
        if not self.enabled or not self.is_available():
            return OllamaResponse(
                success=False,
                error="Ollama service is not available",
                model=self.model
            )
        
        try:
            start_time = datetime.utcnow()
            
            # Build request payload
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "num_predict": max_tokens,
            }
            
            # Add system context if provided
            if system_context:
                payload["system"] = system_context
            
            # Make request to Ollama
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            
            latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            if response.status_code != 200:
                error_msg = f"Ollama returned status {response.status_code}"
                logger.warning(error_msg)
                return OllamaResponse(
                    success=False,
                    error=error_msg,
                    model=self.model,
                    latency_ms=latency_ms
                )
            
            # Parse response
            result = response.json()
            generated_text = result.get("response", "").strip()
            
            if not generated_text:
                error_msg = "Ollama returned empty response"
                logger.warning(error_msg)
                return OllamaResponse(
                    success=False,
                    error=error_msg,
                    model=self.model,
                    latency_ms=latency_ms
                )
            
            return OllamaResponse(
                success=True,
                text=generated_text,
                model=self.model,
                latency_ms=latency_ms
            )
        
        except requests.Timeout:
            error_msg = f"Ollama request timed out after {self.timeout}s"
            logger.warning(error_msg)
            return OllamaResponse(
                success=False,
                error=error_msg,
                model=self.model
            )
        except Exception as e:
            error_msg = f"Ollama service error: {str(e)}"
            logger.error(error_msg)
            return OllamaResponse(
                success=False,
                error=error_msg,
                model=self.model
            )
    
    def generate_recovery_explanation(self, context: Dict[str, Any]) -> OllamaResponse:
        """
        Generate AI explanation for a recovery recommendation.
        
        Input context (from deterministic engine):
        - opportunity_id
        - revenue_amount
        - recommended_action
        - recovery_probability
        - expected_net_value
        - recoverability_score
        - risk_level
        - customer_friction_score
        - failure_reason
        
        Returns: Natural language explanation of the recommendation.
        """
        if not self.enabled or not self.is_available():
            return OllamaResponse(success=False, error="Ollama unavailable")
        
        # Build prompt - be explicit that this is NOT financial advice
        prompt = f"""Based on these deterministic recovery metrics, provide a brief 1-2 sentence explanation:

Opportunity: ₹{context.get('revenue_amount', 0):,.0f}
Recommended Action: {context.get('recommended_action', 'UNKNOWN')}
Recovery Probability: {context.get('recovery_probability', 0)*100:.0f}%
Expected Net Value: ₹{context.get('expected_net_value', 0):,.0f}
Recoverability: {context.get('recoverability_score', 0)}/100
Risk Level: {context.get('risk_level', 'UNKNOWN')}
Reason for Failure: {context.get('failure_reason', 'Unknown')}

Explain why this action is recommended, grounded only in these metrics. Do not invent facts."""
        
        return self.generate_explanation(
            prompt=prompt,
            system_context="You are a financial analysis assistant. Provide concise explanations based only on provided data.",
            max_tokens=120
        )
    
    def generate_risk_explanation(self, context: Dict[str, Any]) -> OllamaResponse:
        """
        Generate AI explanation for risk assessment.
        
        Input context (from risk model):
        - opportunity_id
        - revenue_amount
        - risk_score (0-100)
        - risk_level (LOW/MEDIUM/HIGH/CRITICAL)
        - risk_drivers (list of strings)
        - failure_reason
        
        Returns: Natural language explanation of the risk.
        """
        if not self.enabled or not self.is_available():
            return OllamaResponse(success=False, error="Ollama unavailable")
        
        drivers = ", ".join(context.get("risk_drivers", []))
        
        prompt = f"""Based on these deterministic risk metrics, provide a brief 1-2 sentence explanation:

Opportunity: ₹{context.get('revenue_amount', 0):,.0f}
Risk Score: {context.get('risk_score', 0)}/100
Risk Level: {context.get('risk_level', 'UNKNOWN')}
Risk Drivers: {drivers}
Failure Type: {context.get('failure_reason', 'Unknown')}

Explain the risk assessment, grounded only in these metrics. Do not invent facts or predictions."""
        
        return self.generate_explanation(
            prompt=prompt,
            system_context="You are a financial risk analyst. Provide concise explanations based only on provided data.",
            max_tokens=120
        )
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get health status of Ollama service.
        
        Returns:
            Dict with connected status, model info, and latency
        """
        if not self.enabled:
            return {
                "enabled": False,
                "connected": False,
                "reason": "Ollama integration disabled"
            }
        
        try:
            start_time = datetime.utcnow()
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=2
            )
            latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                
                return {
                    "enabled": True,
                    "connected": True,
                    "url": self.base_url,
                    "model": self.model,
                    "model_installed": any(self.model in m for m in models),
                    "latency_ms": round(latency_ms, 1),
                    "available_models": models
                }
            else:
                return {
                    "enabled": True,
                    "connected": False,
                    "reason": f"HTTP {response.status_code}"
                }
        except requests.Timeout:
            return {
                "enabled": True,
                "connected": False,
                "reason": "Timeout"
            }
        except Exception as e:
            return {
                "enabled": True,
                "connected": False,
                "reason": str(e)
            }


# Global instance
_ollama_service: Optional[OllamaService] = None


def get_ollama_service() -> OllamaService:
    """Get or create global Ollama service instance."""
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service
