# Maintenance Optimization Backend API

FastAPI backend server for the Maintenance Optimization Tool using Linear Programming (SciPy HiGHS solver).

## Features

- **No Gurobi License Required** - Uses only free, open-source SciPy linprog solver
- **POMDP Optimization** - Partially Observable Markov Decision Process for maintenance scheduling
- **Corrected Metrics** - Accurate calculation of intervention thresholds and probabilities

## Installation

1. Install Python dependencies:
```bash
pip install fastapi uvicorn numpy scipy pydantic
```

Or using requirements.txt:
```bash
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

## API Endpoint

### POST /api/optimize

**Request Body:**
```json
{
  "alpha": 0.7,
  "K": 4,
  "C": 5,
  "cp": 100,
  "cc": 500,
  "ct": 50,
  "cr": 2000,
  "cu": 150,
  "co": 200
}
```

**Parameters:**
- `alpha`: Self-transition probability (component stays at current deterioration level)
- `K`: Maximum deterioration level (red/failure state)
- `C`: Number of components in the system
- `cp`: Preventive maintenance cost
- `cc`: Corrective maintenance cost
- `ct`: Transfer cost per component
- `cr`: Replacement cost per non-green component
- `cu`: Underage cost (too few spare parts)
- `co`: Overage cost (too many spare parts)

**Response:**
```json
{
  "probNotRed": 0.923456,
  "maxInterventionLevel": 3,
  "avgInterventionLevel": 2.8,
  "totalCost": 1245.67,
  "optimalPolicy": [0, 0, 0, 1, 1, ...],
  "costByState": [0, 0, 100, 100, ...],
  "tableRows": [
    {
      "decisionPeriod": 0,
      "signalState": "Not-Red",
      "recommendedAction": "Wait",
      "actionType": "No Action",
      "expectedCost": 0,
      "probability": 0.2,
      "interventionProbability": 0
    },
    ...
  ],
  "stateDescriptions": [[0, 0, 0, 0, 0], ...],
  "iterations": [1868.5, 1494.8, 1307.9, 1245.67]
}
```

## Key Metrics (Corrected)

### 1. probNotRed
Probability of NOT being in red (failure) state.
- Calculated as: `1 - sum(SolutionMat[1, :, :])`
- Red state is signal state s=1

### 2. maxInterventionLevel
Maximum yellow/not-red decision period where preventive maintenance is recommended.
- Only considers not-red state (s=0) with intervention action (a≥1)
- Finds the largest n where `sum(SolutionMat[0, n, 1:C+1]) > threshold`

### 3. avgInterventionLevel
Average intervention period for preventive maintenance only.
- Only includes not-red state preventive interventions
- Does NOT include red state corrective maintenance
- Calculated as weighted average: `sum(n * P[0,n,a≥1]) / sum(P[0,n,a≥1])`

### 4. optimalPolicy
Array showing action at each decision period (yellow/not-red state only):
- `0` = Wait (no maintenance)
- `1` = Preventive Maintenance
- Red state corrective actions are not included

### 5. tableRows
Clean table data for frontend display showing:
- Decision period (n)
- Signal state (always "Not-Red" in table)
- Recommended action
- Action type
- Expected cost
- State probability
- Intervention probability

Table stops after first preventive intervention threshold.

## CORS Configuration

The server allows all origins by default for development. For production, update the CORS settings in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Frontend Integration

Update the frontend API endpoint in `src/app/utils/mdpSolver.ts`:

```typescript
const API_ENDPOINT = 'http://localhost:8000/api/optimize';
```

For production, use your deployed backend URL.
