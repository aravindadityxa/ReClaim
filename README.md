# ReClaim

**AI-Assisted Revenue Recovery Intelligence Platform**

Recover lost revenue at scale with deterministic ML-powered risk scoring, intelligent recovery strategies, and locally-run AI explanations.

## Overview

ReClaim solves the revenue recovery problem at enterprise scale. When customers fail to complete payments, traditional retry systems lack intelligence—they either retry blindly (wasting customer goodwill) or don't retry at all (losing revenue).

ReClaim combines:
- **ML-powered risk intelligence** — Detect at-risk revenue before it becomes unrecoverable
- **Mathematical recovery engine** — Calculate optimal recovery probability and net value for each opportunity
- **Deterministic action selection** — Choose the best recovery strategy based on risk, value, and customer profile
- **Local AI explanations** — Understand decisions in natural language using qwen2:1.5b running locally
- **Governance & approvals** — Enforce policy controls and prevent fraudulent recovery attempts
- **Production reliability** — Graceful fallback, comprehensive error handling, RBAC, JWT authentication

**Key Distinction:** The platform remains fully operational even when the local AI service is unavailable—governance and recovery decisions are purely deterministic, ML-based, and mathematically sound.

---

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+ / npm
- Git
- Ollama (optional, for local AI explanations)

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env
# Edit .env and set JWT_SECRET_KEY to a strong random value

# Initialize database and seed with data
python init_db.py

# Start the backend server
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

### Demo Credentials
- **Username:** `admin`
- **Password:** `Admin@123456`

---

## Features

### Revenue Command Center
- Key metrics: Total revenue, revenue at risk, estimated recoverable, recovered revenue
- Revenue health score based on payment success, risk ratio, recovery rate
- 30-day revenue trends showing successful vs failed transactions
- Risk breakdown by opportunity type
- Filterable opportunities table with status and risk classification
- Activity timeline with recent revenue events

### Risk Intelligence
- **ML-powered risk scoring** (0-100) for each opportunity based on 26 engineered features
- Automatic risk classification: LOW, MEDIUM, HIGH, CRITICAL
- Priority queue of opportunities ranked by risk and value
- Risk driver extraction showing main factors contributing to risk
- 30-day trends with anomaly/spike detection
- Cohort analysis: Risk breakdown by payment method, failure reason, customer segment
- Model performance metrics: F1 score, precision, recall, ROC-AUC

### Recovery Intelligence
- ML-based next best action selection
- Recovery actions: Payment retry, payment link, customer reminder, subscription retry, invoice reminder
- Optimal recovery timing calculation (minimize customer friction)
- Portfolio metrics showing expected recovery value across opportunities
- Recovery queue: Opportunities ranked and ready for recovery

### Governance & Safety
- Backend-enforced policy engine (no frontend bypass)
- Approval workflow for high-value or high-risk actions
- Action allowlist (only supported recovery actions permitted)
- Policy rules: Maximum attempts, customer contact limits, value thresholds, probability requirements
- Customer fatigue protection with friction scoring
- Execution time windows
- Emergency pause/resume controls for all autonomous recovery
- Complete governance audit trail

### Recovery Analytics
- Recovery funnel: Track opportunities from detection → action → success
- Strategy performance: Measure effectiveness of each recovery action across dimensions
- Cohort analysis: Performance by payment method, failure reason, customer segment
- Incremental revenue attribution: Measure true incremental recovery revenue
- Strategy recommendations: ML-driven insights from historical performance
- Real-time interactive dashboards

### System Health & Monitoring
- Real-time health checks for database, recovery engine, orchestrator, governance, executor, measurement, audit
- Operational metrics: Recovery attempts, success rates, workflows, governance decisions, action execution
- Error tracking with severity levels (INFO, WARNING, ERROR, CRITICAL)
- Health dashboard showing system status, service health, metrics, error summary
- System status API with quick health summary

### Authentication & Authorization
- JWT-based authentication with 24-hour token expiration
- Four-tier RBAC: ADMIN, OPERATOR, ANALYST, VIEWER
- Fine-grained permission system per role
- bcrypt password hashing (cost=12)
- Security audit trail for all authentication events
- Protected routes and endpoints

---

## Architecture

### System Overview

```
┌─────────────────┐
│  React UI       │
│  (TypeScript)   │
└────────┬────────┘
         │
         ├─ Auth Context
         ├─ ProtectedRoute
         └─ API Client (JWT)
         │
┌────────▼────────────────────────┐
│     FastAPI Backend             │
│  (Python 3.8+, SQLAlchemy)      │
├────────────────────────────────┤
│ Risk Intelligence               │
│  ├─ Feature Engineering (26)    │
│  ├─ LogisticRegression Model    │
│  └─ Risk Scoring                │
├────────────────────────────────┤
│ Recovery Engine                 │
│  ├─ Action Selection            │
│  ├─ Timing Optimization         │
│  └─ Workflow Orchestration      │
├────────────────────────────────┤
│ Governance & Safety             │
│  ├─ Policy Enforcement          │
│  ├─ Approval Workflow           │
│  └─ Action Executor             │
├────────────────────────────────┤
│ Ollama Service (Optional)       │
│  └─ qwen2:1.5b Explanations     │
├────────────────────────────────┤
│ Audit & Analytics               │
│  ├─ Recovery Measurement        │
│  ├─ Outcome Tracking            │
│  └─ Audit Trail                 │
└──────────┬─────────────────────┘
           │
┌──────────▼──────────┐
│   SQLite Database   │
│  (dev/test)         │
└─────────────────────┘
```

### AI Architecture: Deterministic vs AI-Generated

**Deterministic (Always Active):**
- Risk scoring: LogisticRegression model with 26 engineered features
- Recovery actions: Mathematical engine based on risk, value, customer profile
- Governance: Backend policy engine with hard safety limits
- Approvals: Rule-based workflow
- Decisions are reproducible and explainable

**AI-Generated (Local LLM - Optional):**
- Human-readable explanations of risk scoring decisions
- Narrative summaries of recovery recommendations
- Generated using qwen2:1.5b running locally on localhost:11434
- Used for **explanation only** — does NOT influence decisions
- Gracefully degraded when unavailable (decisions still execute)

**LLM Limitations:**
The LLM does **NOT**:
- Determine financial risk
- Modify risk scores
- Override recovery calculations
- Bypass governance policies
- Execute unrestricted financial actions
- Change approval requirements

---

## Technology Stack

**Frontend:**
- React 18.2
- TypeScript 5.2
- Vite 5.0.8
- Tailwind CSS 3.3.6
- Recharts (charting)
- Lucide React (icons)

**Backend:**
- FastAPI
- SQLAlchemy
- Pydantic
- Pandas
- NumPy
- scikit-learn (LogisticRegression)
- SQLite

**AI (Optional):**
- Ollama 0.33.2
- Model: qwen2:1.5b

**Testing & Build:**
- TypeScript tsc
- Vite build
- pytest (Python tests)

**Authentication:**
- JWT (HS256)
- bcrypt

---

## Project Structure

```
ReClaim/
├── backend/
│   ├── main.py                    # FastAPI app, routes
│   ├── models.py                  # SQLAlchemy models
│   ├── auth_service.py            # JWT, password, permissions
│   ├── auth_middleware.py         # Authorization middleware
│   ├── business_logic.py          # Revenue calculations
│   ├── risk_features.py           # 26 feature engineering
│   ├── risk_model.py              # LogisticRegression model
│   ├── recovery_engine.py         # Recovery recommendations
│   ├── recovery_timing.py         # Optimal timing
│   ├── governance_service.py      # Policy engine
│   ├── policy_rules.py            # Policy definitions
│   ├── approval_service.py        # Approval workflow
│   ├── action_executor.py         # Safe execution
│   ├── recovery_measurement.py    # Outcome tracking
│   ├── audit_service.py           # Audit trail
│   ├── ollama_service.py          # Local AI (qwen2:1.5b)
│   ├── database.py                # DB config
│   ├── seed.py                    # Seed data
│   ├── schemas.py                 # Pydantic schemas
│   ├── config.py                  # Configuration
│   ├── init_db.py                 # Database init
│   ├── tests.py                   # Business logic tests
│   ├── tests_governance.py        # Governance tests
│   ├── test_security.py           # Auth/RBAC tests
│   ├── requirements.txt           # Dependencies
│   ├── .env.example               # Environment template
│   └── risk_models/               # ML artifacts (generated)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Opportunities.tsx
│   │   │   ├── RiskIntelligence.tsx
│   │   │   ├── RecoveryIntelligence.tsx
│   │   │   ├── RecoveryControlCenter.tsx
│   │   │   ├── GovernancePage.tsx
│   │   │   ├── RecoveryAnalyticsPage.tsx
│   │   │   ├── SystemHealth.tsx
│   │   │   ├── Activity.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── api.ts                 # API client (typed)
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles/
│   │       └── design-system.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── index.html
│
├── LICENSE
└── README.md
```

---

## Setup Instructions

### Prerequisites Check

```bash
python --version           # Python 3.8+
node --version            # Node 16+
npm --version             # npm 7+
```

### Backend Setup (Step-by-Step)

```bash
# 1. Enter backend directory
cd backend

# 2. Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment template
cp .env.example .env

# 5. Edit .env with strong JWT_SECRET_KEY
# Generate one: python -c "import secrets; print(secrets.token_urlsafe(32))"

# 6. Initialize database (seeds with sample data)
python init_db.py

# 7. Start backend server
python main.py
```

Backend will log:
```
Uvicorn running on http://127.0.0.1:8000
```

### Frontend Setup (Step-by-Step)

```bash
# 1. Enter frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Frontend will log:
```
  Local:   http://localhost:5173/
```

### Ollama Setup (Optional - for AI Explanations)

Ollama provides local AI explanations. Not required for core functionality.

```bash
# 1. Download and install Ollama
# From: https://ollama.ai

# 2. Start Ollama service
ollama serve
# Ollama will listen on localhost:11434

# 3. Pull qwen2:1.5b model
ollama pull qwen2:1.5b

# 4. Verify installation
ollama list
# Should show: qwen2:1.5b

# 5. Verify connectivity
curl http://localhost:11434/api/tags
```

**Configure Backend for Ollama:**

In `.env`:
```env
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:1.5b
OLLAMA_TIMEOUT=30
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

3. **Login** to http://localhost:5173:
   - Username: `admin`
   - Password: `Admin@123456`

4. **Navigate** through Dashboard → Risk Intelligence → Recovery Intelligence

---

## API Overview

### Authentication

```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "Admin@123456"
}

Response:
{
  "access_token": "eyJ0eXAi...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "username": "admin",
    "role": "ADMIN"
  }
}
```

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Risk API

```
GET  /api/risk/summary              # Risk metrics
GET  /api/risk/queue?limit=20       # Top opportunities
GET  /api/risk/opportunities/{id}   # Risk details
```

### Recovery API

```
GET  /api/recovery/queue            # Recovery opportunities
GET  /api/recovery/recommendation/{id}  # Next best action
```

### Governance API

```
GET  /api/governance/policies       # Current policies
POST /api/governance/evaluate       # Policy check
GET  /api/governance/approvals      # Approval queue
```

### Analytics API

```
GET  /api/analytics/recovery/funnel       # Recovery metrics
GET  /api/analytics/recovery/strategies   # Strategy performance
```

### System API

```
GET  /health                        # Health check
GET  /api/system/health             # System status
GET  /api/system/errors             # Error tracking
```

### Ollama API (Optional)

```
GET  /api/system/ollama-status      # Ollama connection status
GET  /api/risk/explanation/{id}     # AI risk explanation
GET  /api/recovery/explanation/{id} # AI recovery explanation
```

---

## Security

### Authentication

- JWT tokens with 24-hour expiration
- Secure password hashing with bcrypt (cost=12)
- Session tokens stored in sessionStorage (frontend)

### Authorization

- Role-Based Access Control (RBAC)
- Four roles: ADMIN, OPERATOR, ANALYST, VIEWER
- Fine-grained permissions per role
- Backend enforcement (frontend cannot bypass)

### Protection Mechanisms

- Input validation on all endpoints
- SQL injection prevention (SQLAlchemy ORM)
- CORS configuration
- Secrets never committed (.gitignore)
- Environment variables for all sensitive data

### Policy Engine

- Hard safety limits cannot be modified
- All actions validated before execution
- Governance rules backend-enforced
- Audit trail of all decisions

---

## Performance

**Optimizations:**
- N+1 query elimination
- Database caching
- Parallel API operations (Promise.all)
- Frontend lazy loading with React.lazy
- Component memoization
- Code splitting with Vite
- React Suspense for async loading

**Considerations:**
- SQLite suitable for development
- Data loaded on-demand per page
- Governance checks are deterministic (fast)
- AI explanations load independently (don't block decisions)

---

## Testing

### TypeScript Verification

```bash
cd frontend
npx tsc --noEmit
```

Must show: `0 errors`

### Build Verification

```bash
cd frontend
npm run build
```

Must complete successfully.

### Backend Tests

```bash
cd backend
pytest tests.py -v                  # Business logic
pytest tests_governance.py -v       # Governance
pytest test_security.py -v          # Auth & RBAC
```

### Full Flow Test

1. Login with demo credentials
2. Navigate Dashboard → view revenue metrics
3. Go to Risk Intelligence → view opportunities
4. Go to Recovery Intelligence → view recommendations
5. Check System Health → verify all services
6. (Optional) Trigger AI explanation if Ollama running

---

## Demo Workflow

1. **Login** → Use demo credentials
2. **Dashboard** → View revenue summary, health metrics
3. **Risk Intelligence** → Explore opportunities, view risk drivers
4. **Recovery Intelligence** → View recovery recommendations
5. **Recovery Control Center** → Manage workflows, execute actions
6. **Governance** → Review policies, approval queue
7. **Recovery Analytics** → View funnel, strategy performance
8. **System Health** → Monitor service health, check Ollama
9. **User Management** (Admin) → Manage users and roles
10. **Settings** → Configure system preferences

---

## Limitations & Notes

### Ollama (AI Explanations)

- Requires local installation (not cloud-based)
- Model size: 934 MB for qwen2:1.5b
- Performance depends on hardware (CPU/RAM)
- Explanations are **informational only** — do not influence decisions
- Application remains fully functional when Ollama is offline

### Database

- SQLite is suitable for development and testing
- Production deployment should use PostgreSQL or similar
- Database file: `reclaim.db` in backend directory

### Deployment Status

- **Development**: Fully functional with local setup
- **Testing**: All core features operational
- **Production**: Not yet deployed to cloud

### Model & Architecture

- Deterministic ML model (LogisticRegression) cannot be replaced
- qwen2:1.5b is the specified local AI model
- Architecture is production-ready for local deployment
- All API contracts are stable

---

## Environment Variables

```env
# Backend
DATABASE_URL=sqlite:///./reclaim.db
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
JWT_SECRET_KEY=<strong-random-key>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Ollama (Optional)
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:1.5b
OLLAMA_TIMEOUT=30
```

---

## License

See LICENSE file for details.

---

**Status:** Production-Grade Revenue Recovery Intelligence Platform

**Last Updated:** August 2026

