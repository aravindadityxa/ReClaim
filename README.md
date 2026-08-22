# ReClaim - Revenue Command Center + Risk Intelligence

An AI Revenue Recovery & Intelligence Platform for the Razorpay Buildathon.

**Phase 1:** Revenue Command Center - Comprehensive dashboard for revenue overview  
**Phase 2:** Risk Intelligence - ML-based risk scoring and predictive analytics

## Overview

ReClaim helps merchants:
- Detect revenue at risk
- Understand why revenue is at risk
- Predict which opportunities are most likely to be lost (Phase 2)
- Determine what is worth recovering
- Execute recovery safely
- Measure incremental revenue
- Learn and improve

This implementation includes both Phase 1 (Revenue Command Center) and Phase 2 (Risk Intelligence) - a complete platform for revenue risk detection, analysis, and recovery opportunity prioritization.

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
│   ├── business_logic.py         # Phase 1: Revenue calculations
│   ├── risk_features.py          # Phase 2: Feature engineering (26 features)
│   ├── risk_model.py             # Phase 2: LogisticRegression model
│   ├── risk_analytics.py         # Phase 2: Risk calculations
│   ├── database.py               # Database configuration
│   ├── seed.py                   # Deterministic seed data (186 transactions)
│   ├── schemas.py                # Pydantic schemas
│   ├── config.py                 # Configuration
│   ├── init_db.py                # Database initialization
│   ├── tests.py                  # Phase 1 pytest tests
│   ├── tests_phase2.py           # Phase 2 pytest tests
│   ├── test_runner.py            # Phase 1 standalone test runner
│   ├── verify_phase2.py          # Phase 2 standalone verification
│   ├── requirements.txt          # Python dependencies
│   ├── risk_models/              # ML model artifacts (generated)
│   └── .env.example              # Environment template
│
├── frontend/                      # React + Vite frontend
│   ├── src/
│   │   ├── pages/               # Dashboard, Opportunities, Activity, Risk Intelligence, Settings
│   │   ├── components/          # Reusable UI components (Badge, Cards, Queue, etc.)
│   │   ├── App.tsx              # Main app with navigation
│   │   ├── api.ts               # API client with risk methods
│   │   ├── types.ts             # TypeScript types (including Phase 2)
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

### Phase 1: Revenue Command Center

#### Dashboard
- **Key Metrics**: Total revenue, revenue at risk, estimated recoverable, recovered revenue
- **Revenue Health**: Deterministic health score (0-100) based on payment success, risk ratio, recovery rate, and stability
- **Revenue Trend**: 30-day chart showing successful vs failed transactions
- **Risk Breakdown**: Pie chart and detailed breakdown by opportunity type
- **Risk Trend**: Determination of whether revenue risk is increasing, stable, or decreasing

#### Revenue Opportunities
- **Filterable Table**: Filter by status, risk level, type, recoverability
- **Sorting**: Sort by amount, creation date, or risk level
- **Detail Modal**: View complete opportunity details including transaction info and timeline
- **Badge System**: Visual indicators for status, risk, and recoverability

#### Revenue Activity
- **Event Timeline**: Recent revenue events with timestamps
- **Event Types**: Opportunity creation, recovery, status changes
- **Relative Timestamps**: Smart relative time formatting (e.g., "2h ago")

### Phase 2: Risk Intelligence

#### Risk Overview
- **Risk Summary**: High-risk revenue, opportunity count, average risk score, most common risk driver
- **Model Performance**: F1 score, precision, recall, ROC-AUC from ML model
- **Confidence Levels**: Model confidence based on training data volume

#### Risk Analytics
- **Risk Scoring**: ML-powered loss probability (0-100) for each opportunity
- **Risk Levels**: Automatic classification (LOW/MEDIUM/HIGH/CRITICAL)
- **Priority Queue**: Opportunities ranked by priority (expected loss × recoverability × urgency)
- **Risk Drivers**: Structured extraction of main risk factors (payment failure type, customer history, aging, etc.)

#### Risk Trends & Detection
- **30-Day Trends**: Risk metrics over time with trend visualization
- **Spike Detection**: Automatic anomaly detection (20%+ unusual increase)
- **Cohort Analysis**: Risk breakdown by payment method, failure reason, or opportunity type
- **Recovery Prediction**: ML model predicts whether opportunity will be LOST or RECOVERED

### Settings
- **Phase 2 Placeholder**: Clear indication of what's coming in Phase 3

## API Endpoints

### Phase 1: Revenue Endpoints
```
GET  /health                              # Health check
GET  /api/dashboard/revenue-summary       # Dashboard metrics
GET  /api/dashboard/revenue-trend         # Revenue trends (30 days)
GET  /api/revenue-opportunities           # List opportunities with filters
GET  /api/revenue-opportunities/{id}      # Opportunity details
GET  /api/revenue-activity                # Revenue event timeline
```

### Phase 2: Risk Intelligence Endpoints
```
GET  /api/risk/summary                    # Risk summary metrics
GET  /api/risk/queue?limit=20             # Top opportunities by priority
GET  /api/risk/drivers                    # Risk breakdown by driver
GET  /api/risk/cohort?dimension=...       # Risk by cohort (payment_method|failure_reason|opportunity_type)
GET  /api/risk/trend?days=30              # Risk trends over time
GET  /api/risk/spike?days=7               # Spike detection
GET  /api/risk/opportunities/{id}         # Detailed opportunity risk analysis
GET  /api/risk/model-performance          # Model metrics and info
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

### Phase 2 Risk Classifications
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

### Phase 1 Tests
Run Phase 1 business logic validation:

```bash
cd backend
python test_runner.py
```

Or run pytest:

```bash
pytest tests.py -v
```

Validates:
- Data generation (15 customers, 186+ transactions)
- Revenue calculations
- Health score computation
- Trend analysis
- Risk breakdown

### Phase 2 Tests
Run Phase 2 risk intelligence verification:

```bash
cd backend
python verify_phase2.py
```

Or run pytest:

```bash
pytest tests_phase2.py -v
```

Validates:
- Feature engineering (26 features)
- Model training (LogisticRegression)
- Risk scoring and classification
- Risk analytics (drivers, trends, cohorts)
- API integration

## Design Principles

### Code Quality
- Clear, readable code with minimal comments
- Small, focused functions and components
- Sensible module boundaries
- No unnecessary abstractions

### UI/UX
- Professional fintech operations dashboard aesthetic
- Information-dense and easy to scan
- Clean typography and spacing
- Color used to communicate status (success, warning, risk, critical)
- No excessive animations or decorative elements

### Architecture
- Backend calculations are authoritative (frontend displays only)
- Deterministic business logic (no AI/ML in Phase 1)
- Organized for future ML/intelligence layers
- Separation between data persistence and business logic

## Implementation Status

### Phase 1: Revenue Command Center ✓ COMPLETE
**Fully Implemented:**
- Revenue risk detection and classification
- Dashboard with key metrics and visualizations
- Opportunity management and filtering
- Activity timeline
- Error and loading states
- Deterministic business logic

### Phase 2: Risk Intelligence ✓ COMPLETE
**Fully Implemented:**
- Feature engineering (26 features from transactions/customers/opportunities)
- ML-based loss prediction (LogisticRegression)
- Risk scoring (0-100) and classification (LOW/MEDIUM/HIGH/CRITICAL)
- Priority scoring (expected loss × recoverability × urgency)
- Risk drivers extraction (structured feature inspection)
- Risk analytics (summary, queue, drivers, trends, spike detection, cohorts)
- Model explainability (feature importance, confidence levels)
- Risk Intelligence frontend page with charts and queue
- 8 new Risk API endpoints

**Not Implemented (Future Phases):**
- Next Best Action recommendations
- Next Best Time optimization
- Recovery portfolio optimization
- Automated recovery execution
- Razorpay integration
- LLM assistance (Ollama/Qwen3)

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

- SQLite is sufficient for Phase 1 data volumes
- Frontend loads data on-demand per page
- No real-time updates in Phase 1 (refresh to see new data)
- Charts render efficiently with Recharts

## Security

- Input validation on all API endpoints
- No secrets committed to repository
- CORS configured for development
- SQL queries use SQLAlchemy ORM (safe from injection)

## Future Considerations

- PostgreSQL for production scale
- Redis caching for dashboard metrics
- WebSocket for real-time updates
- Model versioning and comparison (currently keeps only latest)
- Advanced feature engineering
- Razorpay Test Mode integration
- Local Ollama + Qwen3 4B for merchant copilot

## Development Notes

### ML Model Artifacts
The `backend/risk_models/` directory contains generated model artifacts (pickled model, scaler, metadata). These are:
- Generated automatically on first API request or `init_db.py` run
- Not committed to Git (.gitignore prevents this)
- Recreated on each fresh database initialization
- Safe to delete locally (will be retrained on next startup)

To retrain the model after changes:
1. Delete `backend/risk_models/` directory
2. Restart the backend or call an API endpoint
3. Model will auto-train from current database data

### Adding New Risk Features
1. Add feature extraction to `risk_features.py` (RiskFeatureEngine class)
2. Update `get_feature_names()` to include new feature
3. Model will automatically retrain with new features
4. No other changes needed - auto-detected on next training

## Support

For the Razorpay Buildathon, please refer to the specification in the root directory.

---

**Version:** 0.2.0 (Phase 1 + Phase 2)  
**Status:** MVP - Revenue Command Center + Risk Intelligence complete
