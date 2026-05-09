# Backend API Integration Guide

## Overview

This application uses a **client-server architecture**. The React frontend collects user parameters and sends them to a Python/FastAPI backend via a REST API. The backend runs the LP optimization model (using Gurobi) and returns the results.

## Architecture

```
┌──────────────────┐     HTTP POST (JSON)      ┌──────────────────────┐
│   React Frontend │  ────────────────────────► │  FastAPI Backend     │
│   (port 5173)    │                            │  (port 8000)         │
│                  │  ◄──────────────────────── │                      │
│   Displays       │     JSON Response          │  Runs LP solver      │
│   results        │                            │  via Gurobi          │
└──────────────────┘                            └──────────────────────┘
```

## API Endpoint

**URL:** `http://localhost:8000/api/optimize`
**Method:** `POST`
**Content-Type:** `application/json`

The endpoint is configured in `/src/app/utils/mdpSolver.ts`:

```typescript
const API_ENDPOINT = 'http://localhost:8000/api/optimize';
```

## Request Format

The frontend sends 8 parameters as JSON. Epsilon (ε=0.01) is hardcoded in the backend.

```json
{
  "alpha": 0.85,
  "K": 3,
  "C": 2,
  "cp": 100,
  "cc": 400,
  "ct": 0,
  "cr": 50,
  "cu": 100,
  "co": 5
}
```

### Parameter Descriptions

| Parameter | Symbol | Type  | Description |
|-----------|--------|-------|-------------|
| `alpha`   | α      | float | Deterioration probability — probability that a component stays at its current level each period |
| `K`       | K      | int   | Maximum deterioration level — number of degradation levels before failure (red state) |
| `C`       | C      | int   | Number of components in the system |
| `cp`      | cp     | float | Preventive maintenance cost — cost of performing planned maintenance ($) |
| `cc`      | cc     | float | Corrective maintenance cost — cost of emergency repair after failure ($) |
| `ct`      | ct     | float | Transfer cost per component — cost of transporting each component to maintenance ($) |
| `cr`      | cr     | float | Replacement cost per non-green — cost of replacing each deteriorated component ($) |
| `cu`      | cu     | float | Underage cost — penalty for bringing fewer spare parts than needed ($) |
| `co`      | co     | float | Overage cost — penalty for bringing more spare parts than needed ($) |

## Response Format

**Status:** `200 OK`

```json
{
  "probNotRed": 0.9851,
  "maxInterventionLevel": 5,
  "avgInterventionLevel": 4.91,
  "totalCost": 25.38,
  "optimalPolicy": [0, 0, 0, 2, 2, 2, 0],
  "costByState": [10.5, 25.3, 80.1, 142.6],
  "stateDescriptions": [[0,0], [1,0], [0,1], [1,1]],
  "iterations": [38.07, 30.46, 26.65, 25.38]
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `probNotRed` | float | Probability that the system is NOT in a failure (red) state — displayed as a percentage on the dashboard |
| `maxInterventionLevel` | int | Maximum counter level (n*) at which the optimal policy triggers preventive maintenance |
| `avgInterventionLevel` | float | Weighted average counter level at which maintenance interventions occur |
| `totalCost` | float | Optimal long-run average cost per period under the optimal maintenance policy ($) |
| `optimalPolicy` | int[] | Array of recommended actions for each counter level: 0 = Continue Operation, 1 = Preventive Maintenance, 2 = Corrective Maintenance |
| `costByState` | float[] | Expected cost at each counter level (used for chart visualization) |
| `stateDescriptions` | int[][] | Deterioration state vectors for each joint state |
| `iterations` | float[] | Convergence history values (used for chart visualization) |

## Error Handling

If the optimization fails (e.g., Gurobi cannot find an optimal solution), the backend returns:

```json
{
  "detail": "Error message describing what went wrong"
}
```
**Status:** `500 Internal Server Error`

The frontend catches this and displays an alert to the user.

## CORS Configuration

The backend allows all origins for development:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, replace `"*"` with the specific frontend domain.

## How to Run

### Backend (Terminal 1)
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Frontend (Terminal 2)
```bash
npx vite --host
```

### Required Python Packages
```bash
pip install fastapi uvicorn pydantic numpy gurobipy scipy
```

A valid **Gurobi license** is also required (free academic license available at gurobi.com).
