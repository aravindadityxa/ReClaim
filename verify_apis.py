#!/usr/bin/env python3
import requests
import sys

base_url = "http://localhost:8000/api"

results = {
    "recovery_queue": None,
    "risk_queue": None
}

try:
    resp = requests.get(f"{base_url}/recovery/queue?limit=1", timeout=5)
    results["recovery_queue"] = resp.status_code
    print(f"Recovery Queue Status: {resp.status_code}")
except Exception as e:
    print(f"Recovery Queue Error: {e}")
    results["recovery_queue"] = "ERROR"

try:
    resp = requests.get(f"{base_url}/risk/queue?limit=1", timeout=5)
    results["risk_queue"] = resp.status_code
    print(f"Risk Queue Status: {resp.status_code}")
except Exception as e:
    print(f"Risk Queue Error: {e}")
    results["risk_queue"] = "ERROR"

recovery_ok = results["recovery_queue"] == 200
risk_ok = results["risk_queue"] == 200

print(f"\nRecovery Intelligence API: {'PASS' if recovery_ok else 'FAIL'}")
print(f"Risk Intelligence API: {'PASS' if risk_ok else 'FAIL'}")

sys.exit(0 if (recovery_ok and risk_ok) else 1)
