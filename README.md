# ReClaim

### AI-Powered Revenue Recovery Intelligence

ReClaim is an AI-powered revenue recovery platform that identifies revenue at risk, estimates recovery potential, prioritizes recovery opportunities, recommends the next best recovery action, explains those recommendations using local AI, and manages governed recovery workflows with safety controls.

It combines machine-learning risk intelligence, recovery probability and value analysis, opportunity prioritization, recovery strategy selection, local AI explanations, and policy-driven execution controls to turn revenue leakage into actionable recovery opportunities.

---

## Overview

A failed payment does not mean permanently lost revenue. Most failed transactions represent recovery opportunities—customers who intend to complete the purchase, methods that can be retried, subscriptions that need renewal, or invoices that require reminders.

ReClaim answers seven critical questions for each at-risk revenue opportunity:

1. **How much revenue is at risk?** Machine learning estimates the probability and potential value at stake.
2. **Which opportunities deserve attention first?** Opportunities are ranked by recovery value and likelihood.
3. **How likely is recovery?** Recovery probability is estimated based on opportunity characteristics, customer history, and previous attempts.
4. **What recovery action is most appropriate?** The system evaluates payment retry, payment link, customer reminder, subscription retry, and invoice reminder strategies.
5. **What is the expected value of that action?** Recovery probability and cost are weighed against customer impact to calculate net expected value.
6. **When should the action occur?** Timing optimization accounts for retry windows, customer fatigue, and operational constraints.
7. **Is the action permitted under current policies?** Governance rules enforce safety bounds before execution.

The result: revenue recovery opportunities that are identified by ML intelligence, prioritized by value, recommended by AI analysis, governed by policy, and executed safely with full auditability.

---

## Core Capabilities

### AI Risk Intelligence

Machine learning identifies revenue at risk. The system analyzes transaction patterns, customer behavior, payment history, and recovery signals using a logistic regression model trained on historical outcomes. Engineered features capture customer payment behavior, transaction characteristics, failure patterns, and recovery signals to produce a risk score that represents the probability and magnitude of revenue loss.

- ML-driven risk scoring (0-100 scale)
- Risk classification (LOW, MEDIUM, HIGH, CRITICAL)
- Expected loss calculation
- Risk driver identification
- Feature importance tracking
- 30-day trend analysis
- Anomaly spike detection
- Cohort risk analysis
- Model performance metrics (precision, recall, F1, ROC-AUC)

### Recovery Intelligence

Recovery Intelligence bridges risk detection and recovery action. The system evaluates recovery probability, expected value, customer friction, opportunity characteristics, and supported recovery strategies to recommend the most appropriate next action. Recovery Intelligence determines where intervention is most valuable and which recovery strategy should be pursued next based on quantitative analysis of recovery factors.

- Recovery probability estimation
- Expected net value calculation
- Customer friction scoring
- Action eligibility evaluation
- Optimal timing recommendation
- Previous attempt history integration
- Next-best-action ranking
- Strategy comparison and explanation

### Opportunity Prioritization

Opportunities are ranked by recovery value and likelihood rather than treating every failed transaction equally. The priority score combines expected loss amount, recoverability potential, and opportunity urgency to identify which opportunities deserve attention first.

- Priority ranking by recovery value
- Recoverability assessment
- Urgency-based sorting
- Expected loss weighting
- Multi-factor ranking algorithm
- Prioritized opportunity queue

### Recovery Strategies

Five recovery strategies are evaluated and recommended based on opportunity characteristics and recovery potential:

- **Payment Retry** — Automated retry of failed payment
- **Payment Link** — Send new payment link to customer
- **Customer Reminder** — Notification of pending payment
- **Subscription Retry** — Retry subscription charge
- **Invoice Reminder** — Reminder of unpaid invoice

### Local AI Explanations

Understand decisions in natural language. When Ollama runs locally, the system generates concise explanations for why opportunities are prioritized and why specific recovery actions are recommended. Explanations convert decision context into human-readable reasoning using Qwen 2 1.5B, running entirely on-premises with no external API calls.

- Risk explanation generation (Ollama + Qwen 2 1.5B)
- Recovery recommendation explanation
- Local inference (no external dependencies)
- Natural language decision context
- Graceful fallback when unavailable
- 30-second timeout for bounded inference

### Governed AI Recovery

Policy controls govern all recovery actions. AI identifies and prioritizes opportunities, but governance ensures recommendations remain within operational and customer-safety boundaries. The governance engine evaluates policy constraints, triggers approvals where necessary, and prevents unsafe actions.

- Policy-based decision evaluation
- Approval workflow for high-value actions
- Hard safety limits (max attempts, customer contacts)
- Minimum expected value threshold
- Minimum recovery probability threshold
- Customer friction limits
- Execution time windows
- Action allowlisting
- Pause/resume controls
- Complete audit trail

### Revenue Opportunities

Browse and manage revenue at risk. The opportunities interface provides filterable views of at-risk revenue, detailed opportunity information, risk assessments, recovery recommendations, and full action history.

- Filterable opportunity table
- Risk and recoverability assessment
- Recovery recommendations per opportunity
- Historical action tracking
- Customer context and profile
- Expected vs. actual recovery distinction

### Recovery Control Center

Create and manage recovery workflows. Plan recovery actions, validate governance constraints, execute workflows, and track outcomes with real-time status monitoring.

- Workflow creation and planning
- Governance validation before execution
- Action execution with outcome tracking
- Workflow state management
- Execution history and audit trail

### Revenue Activity

Track all revenue events and recovery actions in chronological order. The activity feed shows transaction failures, recovery attempts, outcomes, and system decisions.

- Transaction failure events
- Recovery action execution
- Outcome recording
- Timeline view
- Event filtering and search

### Recovery Analytics

Measure recovery performance and strategy effectiveness. Distinguish between expected recovery (ML projections) and actual recovered revenue (completed outcomes).

- At-risk revenue tracking
- Expected recovery projection
- Actual recovered revenue tracking
- Recovery funnel analysis (at-risk → action → recovery)
- Strategy performance by action type
- Cohort analysis by payment method, failure reason, customer segment
- Conversion rate tracking
- Incremental revenue measurement

### System Health

Monitor platform health and availability. Real-time status of all services, database connectivity, AI availability, and error tracking.

- Service status (database, recovery engines, governance, executor, measurement, audit, Ollama)
- Operational metrics (attempts, success rates, active workflows, governance decisions)
- Error tracking with severity levels
- 24-hour error code summary
- Ollama availability and latency
- Model refresh status

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│         React + TypeScript Frontend             │
│  (Dashboard, Risk, Recovery, Analytics, Health) │
└────────────────────┬────────────────────────────┘
                     │ (JWT Auth)
┌────────────────────▼────────────────────────────┐
│           FastAPI Backend (Python)              │
├─────────────────────────────────────────────────┤
│ Authentication & Authorization (JWT + RBAC)    │
├─────────────────────────────────────────────────┤
│ Revenue Intelligence Layer                      │
│ ├── Feature Engineering                         │
│ ├── ML Risk Model (Logistic Regression)        │
│ ├── Recovery Intelligence Engine               │
│ ├── Opportunity Prioritization                 │
│ └── Next-Best-Action Recommendation            │
├─────────────────────────────────────────────────┤
│ AI Explanation Layer (Optional)                │
│ ├── Ollama Service                             │
│ └── Qwen 2 1.5B Model                          │
├─────────────────────────────────────────────────┤
│ Governance & Policy Engine                      │
│ ├── Policy Evaluation                          │
│ ├── Approval Workflow                          │
│ └── Execution Bounds                           │
├─────────────────────────────────────────────────┤
│ Recovery Orchestrator & Executor               │
│ ├── Workflow Management                        │
│ ├── Action Execution                           │
│ └── State Tracking                             │
├─────────────────────────────────────────────────┤
│ Analytics & Measurement                        │
│ ├── Recovery Funnel Tracking                   │
│ ├── Outcome Measurement                        │
│ └── Strategy Performance                       │
├─────────────────────────────────────────────────┤
│ Audit & Logging                                │
│ ├── Security Audit Trail                       │
│ ├── Decision Logging                           │
│ └── Error Tracking                             │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   SQLite Database       │
        │ (Development/Testing)   │
        └────────────────────────┘
```

---

## Revenue Recovery Intelligence Flow

The system processes revenue events through an intelligent pipeline:

```
Revenue Event (transaction failure)
           ↓
       Feature Engineering
           ↓
       ML Risk Assessment
           ↓
   Risk Score & Classification
           ↓
  Recovery Intelligence Analysis
           ↓
   Opportunity Prioritization
           ↓
    Next-Best-Action Selection
           ↓
    Local AI Explanation (Optional)
           ↓
    Governance Policy Check
           ↓
  Decision Point (Allow/Block/Defer/Approve)
           ↓
  Controlled Execution (if permitted)
           ↓
    Activity & Audit Recorded
           ↓
   Outcome Measurement & Learning
```

---

## ML Risk Intelligence

The risk engine applies machine learning to identify revenue at risk and estimate recovery potential. A logistic regression model trained on historical transaction and customer data predicts the probability that each opportunity will result in revenue loss without intervention.

**Risk Scoring Process:**

- **Feature Engineering**: Transaction data (payment method, amount, failure reason), customer behavior (payment history, success rate, repeat customer), and recovery signals (customer support interactions, timing patterns) are transformed into engineered features.

- **Logistic Regression Model**: The trained model produces a risk probability (0-1) for each opportunity, representing the likelihood of revenue loss if no action is taken.

- **Risk Score**: The probability is converted to a 0-100 risk score for intuitive understanding.

- **Risk Classification**: Scores are classified into risk levels (LOW: 0-25, MEDIUM: 25-50, HIGH: 50-75, CRITICAL: 75-100).

- **Risk Drivers**: The system identifies which features most influence the risk score, providing interpretability and operational insights.

- **Expected Loss**: Risk is weighted by opportunity amount to calculate the expected value at risk.

- **Model Performance**: The system tracks precision, recall, F1 score, and ROC-AUC to validate model accuracy and enable continuous improvement.

**Key Characteristics:**

- Risk is re-calculated per opportunity on each request for current accuracy
- Feature engineering incorporates transaction, customer, and payment signals
- Model handles class imbalance and limited training data
- Feature importance is tracked for operational transparency
- Risk drivers are extracted per opportunity for explainability

---

## Recovery Intelligence Engine

Recovery Intelligence bridges risk detection and recovery action. For each at-risk opportunity, the recovery engine evaluates multiple quantitative factors to determine recovery potential and recommend the next best action.

**Recovery Analysis Process:**

- **Recovery Probability Estimation**: Base recovery probability varies by strategy. Adjustments account for previous attempts, customer history, opportunity age, and payment method. Higher probability indicates better recovery potential.

- **Expected Value Calculation**: Expected recovered amount (recovery probability × opportunity amount) is weighed against action cost and customer friction to calculate net expected value. Higher expected value indicates more worthwhile intervention.

- **Customer Friction Scoring**: Each strategy carries different customer impact. Friction increases with retry attempts, contact frequency, and customer fatigue factors. Lower friction indicates less customer disruption.

- **Action Eligibility**: Supported strategies are evaluated for eligibility based on opportunity type, failure reason, previous attempts, and payment method.

- **Opportunity Age**: Newer opportunities may have higher recovery probability; older opportunities may require different strategies or have expired.

- **Timing Optimization**: The system calculates optimal timing for each action, accounting for retry windows, customer preferences, and operational constraints.

**Supported Recovery Strategies:**

| Strategy | Use Case | Recovery Probability Range |
|----------|----------|---------------------------|
| Payment Retry | Immediate retry of failed payment | 25-35% |
| Payment Link | Direct customer payment for declined methods | 50-65% |
| Customer Reminder | Gentle reminder for abandonment or declined | 40-50% |
| Subscription Retry | Automated retry of recurring charge | 35-40% |
| Invoice Reminder | Reminder of unpaid/overdue invoice | 30-40% |

**Key Distinctions:**

- **Expected Recovery**: Mathematical projection of recovery likelihood based on strategy analysis (not guaranteed).
- **Actual Recovered Revenue**: Counted only after successful completion of recovery action (verified outcome).

These are explicitly tracked separately in analytics and reporting.

---

## Governed AI Recovery

AI and machine learning identify and prioritize recovery opportunities. Governance ensures recommendations remain within operational and customer-safety boundaries.

**Policy Architecture:**

Policy enforcement is the control layer that bounds AI-driven recommendations. Governance rules are evaluated at three decision points:

1. **Opportunity Evaluation**: Is this opportunity eligible for recovery action?
2. **Action Evaluation**: Does this recommended action comply with policy constraints?
3. **Execution Gate**: Is the action permitted to proceed right now?

**Governance Constraints:**

- **Maximum Recovery Attempts**: Per opportunity limit (default: 3 attempts)
- **Maximum Customer Contacts**: Contact frequency limit (default: 2 contacts)
- **Minimum Expected Value**: Actions below threshold are not recommended (default: $100)
- **Minimum Recovery Probability**: Actions below probability threshold are filtered (default: 20%)
- **Customer Friction Limits**: High-friction strategies are deprioritized
- **Execution Time Windows**: Actions can be restricted to business hours or specific windows
- **Action Allowlist**: Only permitted recovery strategies can be executed
- **Retry Limits**: Maximum retry attempts per strategy (default: 2 retries)

**Governance Decisions:**

- **ALLOWED**: Action can proceed immediately
- **BLOCKED**: Action violates policy constraints and cannot proceed
- **REQUIRES_APPROVAL**: High-value action requires human review before execution
- **DEFERRED**: Action is valid but outside current execution window

**Safety Controls:**

- Pause/resume recovery system operations
- Emergency stopping conditions
- Complete audit trail of all decisions
- Real-time policy enforcement (cannot be bypassed)
- Governance evaluation is backend-enforced
- No governance override from frontend

**Flow:**

Policy Check → Opportunity Analysis → Recommendation → Governance Gate → Approval (if needed) → Execution → Outcome Recorded

---

## AI Architecture

ReClaim layers machine learning intelligence, recovery analysis, AI explanations, and governance controls into a transparent decision pipeline.

**1. Signal & Feature Layer**

Transaction, payment, customer, and revenue signals are transformed into engineered features used by the intelligence pipeline. Signals include payment method, transaction amount, failure reason, customer payment history, repeat customer status, and recovery signals.

**2. ML Risk Intelligence**

The logistic regression model produces risk scores and classifications based on engineered features. This layer answers: "What revenue is at risk and how much is at stake?"

**3. Recovery Intelligence**

The recovery engine evaluates recovery probability, expected value, customer friction, and opportunity characteristics. This layer answers: "Which recovery strategies are most valuable and which should we pursue?"

**4. Opportunity Prioritization**

Opportunities are ranked by recovery value and likelihood. The priority score combines expected loss, recoverability potential, and urgency. This layer answers: "Which opportunities deserve our attention first?"

**5. Next-Best-Action Recommendation**

The system evaluates supported recovery strategies and selects/recommends the most appropriate action. This layer answers: "Which recovery strategy should we use for this opportunity?"

**6. Local AI Explanation**

Ollama + Qwen 2 1.5B converts decision context into human-readable natural language. This layer answers: "Why did we recommend this action?"

- Runs entirely on-premises (no external API calls)
- Explains why an opportunity was prioritized
- Explains why a specific recovery action was recommended
- Gracefully disables when unavailable (system continues operating)
- Bounded inference timeout (30 seconds max)

**7. Governance & Approval**

Policy enforcement determines whether the recommended action is permitted, requires human approval, should be deferred, or must be blocked. This layer answers: "Is this action allowed under current policies?"

**8. Controlled Execution**

Only bounded and permitted workflows can proceed. Execution is tracked, auditable, and reversible. This layer answers: "How do we execute safely?"

**9. Measurement & Analytics**

Outcomes are recorded so expected recovery can be distinguished from actual recovered revenue. This layer answers: "What was the actual outcome and what can we learn?"

**Architecture Diagram:**

```
Signals (transaction, customer, payment, revenue)
              ↓
Feature Engineering
              ↓
ML Risk Intelligence (Logistic Regression)
              ↓
Recovery Intelligence Engine
              ↓
Opportunity Prioritization
              ↓
Next-Best-Action Recommendation
              ↓
Local AI Explanation (Ollama + Qwen 2)
              ↓
Governance & Policy Gate
              ↓
Approval Workflow (if needed)
              ↓
Controlled Execution
              ↓
Measurement & Outcome Recording
              ↓
Analytics & Learning
```

**Key Principle:**

Machine learning and recovery intelligence generate the recommendation. Local AI provides an interpretable natural-language explanation. Governance controls bound execution. The entire pipeline remains auditable and explainable.

---

## Authentication & Authorization

ReClaim uses JWT-based authentication with role-based access control (RBAC).

**Authentication:**
- JWT tokens with 24-hour expiration
- Secure password hashing (bcrypt, cost factor 12)
- Session tokens stored client-side (sessionStorage)

**Roles:**
- **ADMIN**: Full platform access, user management, policy management
- **OPERATOR**: Recovery workflow management, action execution, approvals
- **ANALYST**: Read-only access to analytics and intelligence dashboards
- **VIEWER**: Read-only access to dashboard and activity

**Authorization:**
- Fine-grained permission system per role
- Protected API endpoints require valid JWT + permission
- Protected UI routes require authentication
- RBAC enforced at API layer (UI cannot bypass)

---

## Technology Stack

**Frontend:**
- React 18
- TypeScript 5
- Vite 5 (build tool)
- Tailwind CSS (styling)
- Recharts (charting)
- Lucide React (icons)

**Backend:**
- Python 3.8+
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Pydantic (data validation)
- scikit-learn (machine learning)
- Pandas / NumPy (data processing)

**Database:**
- SQLite (development/testing)

**AI:**
- Ollama 0.33+ (local inference)
- Qwen 2 1.5B (language model)

**DevOps:**
- Vite for frontend bundling
- pytest for backend testing
- TypeScript for type safety

---

## Project Structure

```
backend/
  ├── main.py                 # FastAPI app and route definitions
  ├── models.py              # SQLAlchemy ORM models
  ├── schemas.py             # Pydantic request/response schemas
  ├── auth_service.py        # JWT, password hashing, permissions
  ├── risk_features.py       # Feature engineering for ML
  ├── risk_model.py          # Logistic regression implementation
  ├── risk_analytics.py      # Risk scoring service
  ├── recovery_engine.py     # Recovery recommendation logic
  ├── recovery_timing.py     # Optimal timing calculation
  ├── recovery_orchestrator.py # Workflow orchestration
  ├── governance_service.py  # Policy evaluation
  ├── approval_service.py    # Approval workflow
  ├── action_executor.py     # Action execution
  ├── recovery_measurement.py # Outcome tracking
  ├── audit_service.py       # Audit trail
  ├── ollama_service.py      # Ollama AI integration
  ├── database.py            # Database configuration
  ├── config.py              # Environment configuration
  ├── .env.example           # Configuration template
  └── requirements.txt       # Python dependencies

frontend/
  ├── src/
  │   ├── pages/             # Page components
  │   ├── components/        # Reusable components
  │   ├── api.ts             # API client
  │   ├── types.ts           # TypeScript interfaces
  │   ├── context/           # React context (auth)
  │   ├── hooks/             # Custom React hooks
  │   ├── utils/             # Utilities (currency formatting)
  │   └── styles/            # Design system and CSS
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  └── tailwind.config.js
```

---

## Getting Started

### Prerequisites

- Python 3.8 or later
- Node.js 16+ and npm
- Git
- Ollama (optional, for AI explanations)

### Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Generate a strong JWT secret and add it to .env
# Generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
# Add to .env: JWT_SECRET_KEY=<generated_value>

# Initialize database with sample data
python init_db.py

# Start backend server
python main.py
```

Backend runs at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### Ollama Setup (Optional - for AI Explanations)

AI explanations require a local Ollama instance:

```bash
# 1. Install Ollama from https://ollama.ai

# 2. Start Ollama service
ollama serve

# 3. Pull the Qwen 2 model
ollama pull qwen2:1.5b

# 4. Verify it's running
curl http://localhost:11434/api/tags
```

### First Run

1. **Start Backend** (Terminal 1):
```bash
cd backend && python main.py
```

2. **Start Frontend** (Terminal 2):
```bash
cd frontend && npm run dev
```

3. **Login** at `http://localhost:5173`:
   - Username: `admin`
   - Password: `Admin@123456`

4. **Explore**:
   - Dashboard → overview
   - Risk Intelligence → at-risk revenue analysis
   - Recovery Intelligence → recovery recommendations
   - Revenue Opportunities → action management
   - System Health → service monitoring

---

## Environment Variables

```env
# Database
DATABASE_URL=sqlite:///./reclaim.db

# Server
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173

# Authentication & Security
JWT_SECRET_KEY=replace-with-a-random-32-character-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ACCESS_TOKEN_EXPIRES_MINUTES=1440

# Test Mode Configuration (Razorpay)
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Recovery Bounds & Limits
MAX_RECOVERY_ATTEMPTS=3
MAX_CUSTOMER_CONTACTS=2
MAX_RETRY_COUNT=2
MIN_EXPECTED_VALUE=100
MIN_RECOVERY_PROBABILITY=0.2
MAX_PLAN_DURATION_DAYS=7
MAX_ACTION_TIMEOUT_SECONDS=30

# Ollama (AI Explanations - Optional)
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:1.5b
OLLAMA_TIMEOUT_SECONDS=30
```

---

## Application User Flow

The user experience follows a logical revenue recovery workflow:

1. **Dashboard** — Key metrics, system status, at-a-glance recovery overview
2. **Risk Intelligence** — Explore at-risk revenue, risk drivers, cohort analysis, trends
3. **Recovery Intelligence** — View recovery recommendations and analysis
4. **Opportunity Prioritization** — Browse revenue opportunities ranked by recovery value
5. **AI Explanations** — Understand why opportunities are prioritized (when Ollama is available)
6. **Governed Recovery** — Review policies, approval workflows, governance decisions
7. **Recovery Control Center** — Create and manage recovery workflows
8. **Activity & Execution** — Track all recovery actions and outcomes
9. **Recovery Analytics** — Measure performance: expected vs. actual recovery
10. **System Health** — Monitor platform availability and error tracking

---

## Recovery Analytics & Measurement

Measure recovery performance and distinguish between projected and actual results.

**Three Key Metrics:**

1. **At-Risk Revenue**: Total revenue identified as at-risk by the ML model.
2. **Expected Recovery**: Mathematical projection of recovery likelihood based on strategy analysis (not guaranteed).
3. **Actual Recovered Revenue**: Counted only after successful completion of recovery actions (verified outcomes).

**Analytics Capabilities:**

- Recovery funnel tracking (at-risk → action initiated → recovered)
- Expected vs. actual recovery comparison
- Strategy performance by action type
- Cohort analysis (payment method, failure reason, customer segment)
- Conversion rate tracking
- Incremental revenue attribution
- Risk driver analysis
- Model performance metrics

**Note on Test Mode:**

The platform currently operates in TEST MODE. Recovery workflows are fully functional and demonstrate the complete decision → governance → execution → measurement lifecycle. Expected recovery is modeled, but actual recovered revenue reflects the bounded test environment.

---

## Performance & Optimization

- **N+1 Query Elimination**: Eager loading of relationships reduces database round-trips
- **Caching**: Request-scoped analytics instances avoid redundant computation
- **Parallel Operations**: Promise.all combines independent API calls
- **Progressive Loading**: Async data fetching prevents blocking
- **Component Memoization**: React.memo reduces unnecessary re-renders
- **Code Splitting**: Vite lazy-loads pages on demand
- **AI Timeout**: Ollama calls timeout after 30 seconds to prevent blocking

---

## Security

- **Authentication**: JWT-based with secure token generation and validation
- **Authorization**: Role-based access control with fine-grained permissions
- **Password Security**: bcrypt hashing with cost factor 12
- **Environment Secrets**: All sensitive values stored in `.env` (not committed)
- **Protected Routes**: API endpoints require valid JWT and permission
- **Policy Enforcement**: Governance rules cannot be bypassed (backend-enforced)
- **Audit Trail**: Complete record of all security events and decisions
- **RBAC**: Four-tier role system prevents privilege escalation

---

## Test Mode

ReClaim operates in **TEST MODE**. Recovery workflows are fully functional but bounded:

- **Expected Recovery** vs **Actual Recovered Revenue**:
  - Expected recovery is a mathematical projection based on risk and value
  - Actual recovered revenue is tracked only when recovery actions complete successfully
  - These are explicitly distinguished in the analytics and UI

- **Governance Limits**:
  - Maximum 3 recovery attempts per opportunity
  - Maximum 2 customer contacts
  - Execution is constrained by policy limits

- **Razorpay Integration**:
  - Configured in test mode only
  - Does not trigger real payment processing
  - Used for workflow simulation only

The platform remains fully operational and demonstrates complete recovery capabilities within these safe boundaries.

---

## Monitoring & Observability

**System Health Dashboard:**
- Real-time service status (database, engines, orchestrator, governance, executor, audit, Ollama)
- Operational metrics (attempts, success rate, active workflows)
- Error tracking (24-hour error summary by severity and code)
- Ollama status and latency

**Audit Trail:**
- All authentication events (login, logout, role changes)
- All governance decisions and policy evaluations
- All recovery actions and outcomes
- All configuration changes

---

## Future Directions

Potential areas for future development:

- Production database support (PostgreSQL, MySQL)
- Batch workflow scheduling
- Advanced cohort analysis and segmentation
- Machine learning model tuning and retraining
- Multi-tenant support
- Extended recovery action types
- Advanced fraud detection
- Real-time monitoring dashboards

---

## License

See LICENSE file for details.
