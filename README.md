# ReClaim - Intelligent Revenue Recovery & Intelligence Platform

An AI-powered Revenue Recovery & Intelligence Platform for the Razorpay Buildathon.

## Overview

ReClaim helps merchants:
- Detect revenue at risk with ML-powered risk scoring
- Understand why revenue is at risk with feature analysis
- Predict recovery outcomes with decision intelligence
- Execute recovery safely with governance controls
- Manage autonomous recovery workflows with human oversight
- Measure and learn from recovery outcomes
- Configure policies and approval workflows

This is a comprehensive platform for revenue risk detection, analysis, recovery recommendation, and safe autonomous recovery execution with full governance controls.

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+ / npm
- Git

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env

# Initialize database and seed with data
python init_db.py

# Start the backend server
python main.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Full Setup (One Command)

```bash
# From root directory

# Terminal 1: Start backend
cd backend && pip install -r requirements.txt && python init_db.py && python main.py

# Terminal 2: Start frontend
cd frontend && npm install && npm run dev
```

## Project Structure

```
ReClaim/
├── backend/                       # FastAPI backend
│   ├── main.py                   # FastAPI application + endpoints
│   ├── models.py                 # SQLAlchemy models
│   ├── business_logic.py         # Revenue calculations
│   ├── risk_features.py          # Feature engineering (26 features)
│   ├── risk_model.py             # LogisticRegression model
│   ├── risk_analytics.py         # Risk calculations
│   ├── recovery_strategies.py    # Recovery action definitions
│   ├── recovery_engine.py        # Recovery recommendations
│   ├── recovery_timing.py        # Next best time optimization
│   ├── recovery_orchestrator.py  # Agent planner for workflows
│   ├── action_executor.py        # Safe action execution
│   ├── policy_guard.py           # Safety validation
│   ├── governance_service.py     # Policy enforcement engine
│   ├── policy_rules.py           # Policy definitions
│   ├── approval_service.py       # Approval workflow management
│   ├── audit_service.py          # Audit trail logging
│   ├── database.py               # Database configuration
│   ├── seed.py                   # Seed data generation
│   ├── schemas.py                # Pydantic schemas
│   ├── config.py                 # Configuration
│   ├── init_db.py                # Database initialization
│   ├── tests.py                  # Business logic tests
│   ├── tests_governance.py       # Governance tests
│   ├── requirements.txt          # Python dependencies
│   ├── risk_models/              # ML model artifacts (generated)
│   └── .env.example              # Environment template
│
├── frontend/                      # React + Vite frontend
│   ├── src/
│   │   ├── pages/               # Dashboard, Opportunities, Activity, Risk Intelligence, Recovery Intelligence, Recovery Control Center, Governance & Safety
│   │   ├── components/          # Reusable UI components (Badge, Cards, Queue, etc.)
│   │   ├── App.tsx              # Main app with navigation
│   │   ├── api.ts               # API client
│   │   ├── types.ts             # TypeScript types
│   │   └── index.css            # Global styles
│   ├── package.json             # Node dependencies
│   ├── vite.config.ts           # Vite configuration
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── tsconfig.json            # TypeScript configuration
│   └── index.html               # HTML template
│
└── README.md                      # This file
```

## Tech Stack

**Backend:**
- FastAPI - Web framework
- SQLAlchemy - ORM
- Pydantic - Data validation
- SQLite - Database
- Pandas - Data analysis
- NumPy - Numerical computing
- scikit-learn - Machine learning (LogisticRegression for risk prediction)

**Frontend:**
- React 18 - UI library
- Vite - Build tool
- Tailwind CSS - Styling
- Recharts - Charting library
- TypeScript - Type safety
- Lucide React - Icon library

## Features

### Revenue Command Center
- **Key Metrics**: Total revenue, revenue at risk, estimated recoverable, recovered revenue
- **Revenue Health**: Health score based on payment success, risk ratio, recovery rate
- **Revenue Trends**: 30-day chart showing successful vs failed transactions
- **Risk Breakdown**: Breakdown by opportunity type
- **Revenue Opportunities**: Filterable table with status, risk, recoverability
- **Activity Timeline**: Recent revenue events with timestamps

### Risk Intelligence
- **Risk Scoring**: ML-powered loss probability (0-100) for each opportunity
- **Risk Levels**: Automatic classification (LOW/MEDIUM/HIGH/CRITICAL)
- **Priority Queue**: Opportunities ranked by priority
- **Risk Drivers**: Extraction of main risk factors
- **Trends & Detection**: 30-day trends with spike detection
- **Cohort Analysis**: Risk breakdown by payment method, failure reason
- **Model Performance**: F1 score, precision, recall, ROC-AUC

### Recovery Intelligence
- **Recovery Recommendations**: ML-based next best action selection
- **Recovery Actions**: Payment retry, payment link, customer reminder, subscription retry, invoice reminder
- **Next Best Time**: Optimal timing for recovery actions
- **Portfolio Metrics**: Expected recovery value across opportunities
- **Recovery Queue**: Ranked opportunities ready for recovery

### Agentic Recovery Engine
- **Workflow Management**: Bounded autonomous recovery workflows
- **Action Execution**: Safe execution in Razorpay Test Mode
- **State Machine**: DETECTED→PLANNED→READY→EXECUTING→SUCCEEDED/FAILED
- **Recovery Attempts**: Track all actions with execution details
- **Idempotency**: Prevent duplicate execution
- **Audit Trail**: Complete audit log of all operations
- **Stopping Rules**: Automatic stopping conditions (success, max attempts, repeated failures)

### Governance & Safety Engine
- **Policy Enforcement**: Backend-enforced governance on all actions
- **Approval Workflow**: Approval queue for high-value or high-risk actions
- **Action Allowlist**: Only explicitly supported recovery actions
- **Policy Rules**: Maximum attempts, customer contacts, expected value, probability thresholds
- **Friction Protection**: Customer fatigue protection with friction scoring
- **Time Windows**: Execution allowed in specific time windows only
- **Emergency Controls**: Pause/resume all autonomous recovery execution
- **Policy Dashboard**: View and manage merchant policies
- **Governance Audit**: Complete audit of all policy decisions

## API Endpoints

### Revenue Endpoints
```
GET  /health                              # Health check
GET  /api/dashboard/revenue-summary       # Dashboard metrics
GET  /api/dashboard/revenue-trend         # Revenue trends
GET  /api/revenue-opportunities           # List opportunities with filters
GET  /api/revenue-opportunities/{id}      # Opportunity details
GET  /api/revenue-activity                # Revenue event timeline
```

### Risk Intelligence Endpoints
```
GET  /api/risk/summary                    # Risk summary metrics
GET  /api/risk/queue?limit=20             # Top opportunities by priority
GET  /api/risk/drivers                    # Risk breakdown by driver
GET  /api/risk/cohort?dimension=...       # Risk by cohort
GET  /api/risk/trend?days=30              # Risk trends over time
GET  /api/risk/spike?days=7               # Spike detection
GET  /api/risk/opportunities/{id}         # Detailed opportunity risk analysis
GET  /api/risk/model-performance          # Model metrics and info
```

### Recovery Intelligence Endpoints
```
GET  /api/recovery/portfolio              # Portfolio metrics
GET  /api/recovery/queue                  # Recovery opportunities queue
GET  /api/recovery/recommendation/{id}    # Next best action for opportunity
GET  /api/recovery/actions/{id}           # Action comparison
```

### Agentic Recovery & Governance Endpoints
```
POST /api/recovery/workflows/{id}         # Create recovery workflow
POST /api/recovery/workflows/{id}/plan    # Plan recovery actions
POST /api/recovery/workflows/{id}/validate  # Validate and ready workflow
POST /api/recovery/workflows/{id}/execute  # Execute next action
GET  /api/recovery/workflows/{id}         # Get workflow state
GET  /api/recovery/workflows/{id}/audit   # Get audit trail
GET  /api/recovery/control-center         # Control center summary

GET  /api/governance/policies             # Get current policies
PUT  /api/governance/policies/{type}      # Update policy
POST /api/governance/evaluate             # Evaluate action against policies
GET  /api/governance/approvals            # Get approval queue
GET  /api/governance/approvals/{id}       # Get specific approval
POST /api/governance/approvals/{id}/approve  # Approve request
POST /api/governance/approvals/{id}/reject   # Reject request
POST /api/governance/pause                # Pause all recovery execution
POST /api/governance/resume               # Resume recovery execution
GET  /api/governance/dashboard            # Governance dashboard summary
```

## Database

### Models
- **Customer**: Merchant customers
- **Transaction**: Payment transactions (success/failure)
- **RevenueOpportunity**: Failed transactions identified as recovery opportunities with risk classification

### Seed Data
- 15 deterministic customers
- 186 transactions across 60 days
- 33+ revenue opportunities with realistic failure patterns
- Data is reproducible (seeded with fixed random seed)

## Risk Classifications
- Each opportunity is classified by:
  - **Risk Level**: LOW, MEDIUM, HIGH, CRITICAL (based on age and transaction patterns)
  - **Recoverability**: LOW, MEDIUM, HIGH (based on failure type)
  - **Status**: RECOVERABLE, AT_RISK, RECOVERED, or LOST
  - Used as training targets for ML model

## Revenue Calculations

### Revenue Health Score
Weighted composite of:
- **Payment Success Rate** (40%): Percentage of successful transactions
- **Risk Ratio** (30%): Revenue at risk / total revenue (inverted)
- **Recovery Rate** (20%): Recovered revenue / total at-risk revenue
- **Stability** (10%): Base stability metric

### Revenue at Risk
Sum of opportunity amounts with status `AT_RISK` or `RECOVERABLE`

### Estimated Recoverable
Based on recoverability classification:
- HIGH: 75% of opportunity amount
- MEDIUM: 40% of opportunity amount
- LOW: 10% of opportunity amount

## Testing

Run the comprehensive verification suite:

```bash
cd backend
python verify_governance.py
```

Validates:
- Policy rules and validation
- Governance evaluation engine
- Approval workflow
- Pause/resume controls
- Component integration

Run pytest for business logic tests:

```bash
cd backend
pytest tests.py -v
```

Or run governance tests:

```bash
cd backend
pytest tests_governance.py -v
```

## Architecture

### Backend Structure
- **Models**: SQLAlchemy database models for customers, transactions, opportunities, recovery executions, approvals
- **Business Logic**: Revenue calculations, risk scoring, recovery recommendations
- **Recovery Engine**: Agent planner for bounded autonomous recovery workflows
- **Governance**: Policy enforcement, approval workflow, emergency controls
- **Audit**: Complete audit trail of all operations

### Frontend Structure
- **Pages**: Dashboard, Revenue Opportunities, Risk Intelligence, Recovery Intelligence, Recovery Control Center, Governance & Safety
- **Components**: Reusable UI components for cards, tables, charts
- **API Client**: Typed API integration with all backend endpoints
- **Types**: Complete TypeScript type definitions

### Execution Flow
```
Revenue Opportunity
        ↓
Risk Intelligence (ML-powered scoring)
        ↓
Recovery Intelligence (Action recommendation)
        ↓
Agent Planner (Workflow creation)
        ↓
Governance Engine (Policy evaluation)
        ↓
Decision (ALLOWED / BLOCKED / REQUIRES_APPROVAL / DEFERRED)
        ↓
Approval Queue (If approval required)
        ↓
Action Executor (Safe execution in Test Mode)
        ↓
Razorpay Test Mode (Sandboxed execution)
        ↓
Audit Trail (Complete record)
```

## Implementation Status

**Complete & Production Ready:**
- Revenue risk detection and classification
- ML-powered risk scoring and prediction
- Recovery action recommendations
- Recovery workflow orchestration with safe execution
- Governance & Safety Engine with policy enforcement
- Approval workflow for high-value actions
- Emergency pause/resume controls
- Comprehensive audit trail
- Backend policy enforcement (no frontend bypass)
- Razorpay Test Mode integration

## Environment Variables

```env
DATABASE_URL=sqlite:///./reclaim.db    # SQLite database path
BACKEND_PORT=8000                       # Backend server port
FRONTEND_URL=http://localhost:5173     # Frontend URL for CORS
```

## Development

### Adding a New Page
1. Create page component in `frontend/src/pages/`
2. Add navigation item in `App.tsx`
3. Use API client from `api.ts`
4. Implement loading/error/empty states

### Adding a New API Endpoint
1. Define Pydantic schema in `backend/schemas.py`
2. Create route in `backend/main.py`
3. Add business logic in `backend/business_logic.py`
4. Add API client method in `frontend/src/api.ts`

## Performance Notes

- SQLite is sufficient for development
- Frontend loads data on-demand per page
- Governance checks are fast (deterministic backend logic)
- No LLM invocation for policy evaluation (performance critical)
- Charts render efficiently with Recharts

## Security

- Input validation on all API endpoints
- No secrets committed to repository
- CORS configured for development
- SQL queries use SQLAlchemy ORM (safe from injection)
- Backend enforces all policies (no frontend bypass)
- Test Mode only for Razorpay integration
- Hard safety limits cannot be modified through merchant settings

## Future Considerations

- PostgreSQL for production scale
- Redis caching for dashboard metrics
- WebSocket for real-time updates
- Advanced feature engineering for recovery
- LLM integration for policy explanation (Ollama + Qwen3 4B)
- Production Razorpay integration
- Multiple merchant support
- Advanced approval workflow rules

## Development Notes

### ML Model Artifacts
The `backend/risk_models/` directory contains generated model artifacts. These are:
- Generated automatically on first API request or `init_db.py` run
- Not committed to Git (.gitignore prevents this)
- Recreated on each fresh database initialization
- Safe to delete locally (will be retrained on next startup)

### Governance Policy System
Policies are enforced on the backend and cannot be bypassed from the frontend:
- All actions pass through governance evaluation before execution
- Policies are stored in PolicySet with validation
- Approval requests are created for actions requiring approval
- Merchant can configure safe policies (validators prevent unsafe values)
- Hard limits like test-mode-only cannot be changed

### Adding Governance Policies
1. Define PolicyType in `policy_rules.py`
2. Add default value in DefaultPolicies
3. Add validation in PolicyValidator
4. Policies are automatically available through API
5. Frontend displays editable policies

## Support

For implementation details, refer to the API endpoints and test suites.

---

**Status:** Complete - Revenue Risk Intelligence & Safe Autonomous Recovery Platform
**Last Updated:** 2026
