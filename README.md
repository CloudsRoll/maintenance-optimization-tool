# Maintenance Optimization Tool

**Application of Markov Decision Processes to Maintenance Interventions in Partially Observable Multi-Component Systems**

## Overview

A web-based decision support system that helps maintenance engineers determine optimal intervention strategies for multi-component systems under partial observability. The tool uses Discrete-Time Markov Chains (DTMC) and mathematical optimization to minimize long-run average maintenance costs.

## Key Features

- **Mathematical Modeling**: Models component degradation through discrete states (green → yellow → red) using DTMC
- **Partial Observability**: Handles realistic scenarios where exact component states are unknown — only binary signals (failure/no failure) are observed
- **Cost Optimization**: Balances preventive maintenance, corrective maintenance, transfer, replacement, underage, and overage costs
- **Heuristic Comparison**: Compares optimal policy against 6 common rule-of-thumb strategies
- **Interactive Web Interface**: User-friendly parameter input with clear, actionable output metrics

## Architecture

```
┌──────────────────────┐     HTTP/REST API     ┌──────────────────────┐
│   Frontend (React)   │ ◄──────────────────► │  Backend (FastAPI)   │
│   Vite + TypeScript  │                       │  Python + NumPy      │
│                      │                       │                      │
│  • Home Page         │                       │  • Preprocessing     │
│  • Model Setup       │                       │  • State Space Gen   │
│  • Results Dashboard │                       │  • Optimization      │
│  • Model Explanation │                       │  • Policy Generation │
└──────────────────────┘                       └──────────────────────┘
```

## Parameters

| Parameter | Symbol | Description |
|-----------|--------|-------------|
| Deterioration Probability | α (alpha) | Probability a component stays at its current level |
| Max Deterioration Level | K | Number of degradation stages before failure |
| Number of Components | C | Total components in the system |
| Preventive Maintenance Cost | c_p | Cost of scheduled maintenance |
| Corrective Maintenance Cost | c_c | Cost of unplanned repair after failure |
| Transfer Cost | c_t | Cost per component for transferring parts |
| Replacement Cost | c_r | Cost per non-green component replaced |
| Underage Cost | c_u | Penalty for bringing too few spare parts |
| Overage Cost | c_o | Penalty for bringing too many spare parts |

## Output Metrics

1. **System Reliability**: Probability that the system remains operational over time
2. **Recommended Intervention Timing**: Optimal counter level for preventive maintenance
3. **Average Intervention Timing**: Expected counter level at intervention under optimal policy
4. **Total Expected Cost**: Long-run average cost per period

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Project Structure

```
├── src/                    # Frontend source code
│   ├── app/
│   │   ├── components/     # React components (pages, UI elements)
│   │   ├── context/        # React context for state management
│   │   └── utils/          # Utility functions
│   ├── styles/             # CSS themes and fonts
│   └── main.tsx            # Application entry point
├── backend/
│   └── main.py             # FastAPI server with optimization logic
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
└── package.json            # Node.js dependencies
```

## Team

**ENS 492 – Graduation Project (Implementation)**
**Sabancı University**

| Name | Student ID |
|------|-----------|
| Ada Dila Akbulut | 32115 |
| Ekin Savaş | 31071 |
| Ahmet Selim Erdoğan | 32646 |
| Ömer Kürşad Pınar | 28939 |
| Aksel Ünlü | 29540 |

**Supervisor**: Mehmet Murat Fadıloğlu

## References

- Puterman, M. L. (2014). *Markov Decision Processes: Discrete Stochastic Dynamic Programming*. John Wiley & Sons.
- Bertsekas, D. P. (2017). *Dynamic Programming and Optimal Control* (4th ed.). Athena Scientific.
- Ross, S. M. (2014). *Introduction to Probability Models* (11th ed.). Academic Press.

## License

This project is developed as part of the ENS 492 Graduation Project at Sabancı University.