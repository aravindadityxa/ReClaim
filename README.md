# ReClaim - Revenue Command Center

Phase 1 of ReClaim: An AI Revenue Recovery & Intelligence Platform for the Razorpay Buildathon.

## Overview

ReClaim helps merchants:
- Detect revenue at risk
- Understand why revenue is at risk
- Determine what is worth recovering
- Execute recovery safely
- Measure incremental revenue
- Learn and improve

This Phase 1 implementation focuses on the **Revenue Command Center** - a comprehensive dashboard for understanding revenue risk and recovery opportunities.

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
├── backend/                 # FastAPI backend
│   ├── main.py             # FastAPI application
│   ├── models.py           # SQLAlchemy models
│   ├── business_logic.py   # Revenue calculations
│   ├── database.py         # Database configuration
│   ├── seed.py             # Deterministic seed data (130+ transactions)
│   ├── schemas.py          # Pydantic schemas
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Python dependencies
│   ├── init_db.py         # Database initialization
│   ├── test_runner.py     # Business logic tests
│   └── .env.example        # Environment template
│
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/         # Dashboard, Opportunities, Activity, Settings
│   │   ├── components/    # Reusable UI components
│   │   ├── App.tsx        # Main app with navigation
│   │   ├── api.ts         # API client
│   │   ├── types.ts       # TypeScript types
│   │   └── index.css      # Global styles
│   ├── package.json       # Node dependencies
│   ├── vite.config.ts     # Vite configuration
│   └── tailwind.config.js # Tailwind CSS configuration
│
└── README.md              # This file
```

## Tech Stack

**Backend:**
- FastAPI - Web framework
- SQLAlchemy - ORM
- Pydantic - Data validation
- SQLite - Database
- Pandas/NumPy - Data analysis

**Frontend:**
- React 18 - UI library
- Vite - Build tool
- Tailwind CSS - Styling
- Recharts - Charting library
- TypeScript - Type safety

## Features

### Dashboard
- **Key Metrics**: Total revenue, revenue at risk, estimated recoverable, recovered revenue
- **Revenue Health**: Deterministic health score (0-100) based on payment success, risk ratio, recovery rate, and stability
- **Revenue Trend**: 30-day chart showing successful vs failed transactions
- **Risk Breakdown**: Pie chart and detailed breakdown by opportunity type
- **Risk Trend**: Determination of whether revenue risk is increasing, stable, or decreasing

### Revenue Opportunities
- **Filterable Table**: Filter by status, risk level, type, recoverability
- **Sorting**: Sort by amount, creation date, or risk level
- **Detail Modal**: View complete opportunity details including transaction info and timeline
- **Badge System**: Visual indicators for status, risk, and recoverability

### Revenue Activity
- **Event Timeline**: Recent revenue events with timestamps
- **Event Types**: Opportunity creation, recovery, status changes
- **Relative Timestamps**: Smart relative time formatting (e.g., "2h ago")

### Settings
- **Phase 1 Placeholder**: Clear indication of what's coming in future phases

## API Endpoints

```
GET  /health                              # Health check
GET  /api/dashboard/revenue-summary       # Dashboard metrics
GET  /api/dashboard/revenue-trend         # Revenue trends (30 days)
GET  /api/revenue-opportunities           # List opportunities with filters
GET  /api/revenue-opportunities/{id}      # Opportunity details
GET  /api/revenue-activity                # Revenue event timeline
```

## Database

### Models
- **Customer**: Merchant customers
- **Transaction**: Payment transactions (success/failure)
- **RevenueOpportunity**: Failed transactions identified as recovery opportunities

### Seed Data
- 15 deterministic customers
- 186 transactions across 60 days
- 33 revenue opportunities with realistic failure patterns
- Data is reproducible (seeded with fixed random seed)

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

Run business logic validation:

```bash
cd backend
python test_runner.py
```

This validates:
- Data generation (15 customers, 186+ transactions)
- Revenue calculations
- Health score computation
- Trend analysis
- Risk breakdown

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

## Phase 1 Scope

**Fully Implemented:**
- Revenue risk detection and classification
- Dashboard with key metrics and visualizations
- Opportunity management and filtering
- Activity timeline
- Basic error and loading states

**Not Implemented (Future Phases):**
- ML-based recovery prediction
- Next Best Action recommendations
- Next Best Time optimization
- Recovery portfolio optimization
- Automated recovery execution
- Razorpay integration
- Local LLM assistance

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
- ML model serving for recovery prediction
- Razorpay Test Mode integration
- Local Ollama + Qwen3 4B for merchant copilot

## Support

For the Razorpay Buildathon, please refer to the specification in the root directory.

---

**Version:** 0.1.0 (Phase 1)  
**Status:** MVP - Revenue Command Center complete
