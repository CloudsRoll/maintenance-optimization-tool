# Maintenance Optimization Tool - Quick Start Guide

Complete setup guide for the Maintenance Optimization Tool with corrected backend calculations.

## Project Structure

```
code/
├── backend/
│   ├── main.py              # FastAPI backend with corrected calculations
│   ├── requirements.txt     # Python dependencies
│   ├── README.md           # Backend documentation
│   └── CORRECTIONS.md      # Detailed explanation of calculation fixes
├── src/
│   ├── app/
│   │   ├── components/     # React components
│   │   │   ├── ResultsPage.tsx       # Results dashboard
│   │   │   ├── ModelSetupPage.tsx    # Parameter input
│   │   │   ├── ModelExplanationPage.tsx
│   │   │   └── HomePage.tsx
│   │   ├── utils/
│   │   │   └── mdpSolver.ts  # API integration
│   │   └── context/
│   │       └── OptimizationContext.tsx
│   └── styles/
│       └── theme.css        # Blue/navy color scheme
└── package.json
```

## Setup Instructions

### 1. Frontend Setup

Install Node.js dependencies:
```bash
npm install
# or
pnpm install
```

Start the development server:
```bash
npm run dev
# or
pnpm dev
```

The frontend will run at `http://localhost:5173`

### 2. Backend Setup

Navigate to backend directory:
```bash
cd backend
```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Start the backend server:
```bash
python main.py
```

The backend API will run at `http://localhost:8000`

### 3. Configure API Endpoint

The frontend is already configured to connect to `http://localhost:8000/api/optimize`

If you deploy the backend elsewhere, update the endpoint in:
`src/app/utils/mdpSolver.ts`

```typescript
const API_ENDPOINT = 'YOUR_BACKEND_URL/api/optimize';
```

## Testing the Application

### 1. Open the Frontend
Navigate to `http://localhost:5173` in your browser

### 2. Use Default Parameters
The Model Setup page comes pre-filled with sensible defaults:
- **Number of Components**: 5
- **Maximum Deterioration Level**: 4
- **Self Transition Probability**: 0.7
- **Preventive Maintenance Cost**: $100
- **Corrective Maintenance Cost**: $500
- **Transfer Cost**: $50
- **Replacement Cost**: $2000
- **Underage Cost**: $150
- **Overage Cost**: $200

### 3. Run Optimization
Click "Run Optimization" button

### 4. Review Results Dashboard
The dashboard displays:

**KPI Cards:**
- Probability of Not Being in Red State (e.g., 92.3%)
- Maximum Yellow Intervention Level (e.g., Yellow Level n* = 3)
- Average Intervention Level (e.g., 2.8)
- Optimal Expected Cost (e.g., $1,245.67)

**Policy Table:**
- Shows yellow/not-red state decisions only
- Highlights optimal intervention point
- Stops after first preventive maintenance threshold

**Charts:**
- Optimal Intervention Strategy (step chart)
- Expected Cost Over Time (line chart)
- Red dashed line marks n* (optimal intervention point)

## Key Metrics Explained

### Probability of Not Being in Red State
- **What it is:** Likelihood the system hasn't failed
- **Range:** 0% to 100% (higher is better)
- **Interpretation:** 92% means the system avoids failure 92% of the time

### Maximum Yellow Intervention Level (n*)
- **What it is:** Optimal time to perform preventive maintenance
- **Units:** Decision periods since last maintenance
- **Interpretation:** "Perform preventive maintenance at Yellow Level n* = 3"
- **Meaning:** After 3 periods without maintenance, intervene preventively

### Average Intervention Level
- **What it is:** Typical timing of preventive maintenance
- **Calculation:** Probability-weighted average of intervention periods
- **Interpretation:** On average, preventive maintenance occurs at period 2.8

### Optimal Expected Cost
- **What it is:** Long-run average cost per period
- **Includes:** Preventive, corrective, transfer, replacement costs
- **Interpretation:** Expected to spend $1,245.67 per period on average

## Understanding the Results

### Yellow vs Red State
- **Yellow (Not-Red):** System operational, no failures detected
- **Red:** At least one component has failed

### Decision Period (n)
- Number of time periods since last maintenance
- n=0: Just performed maintenance
- n=1: One period after maintenance
- n=2: Two periods after maintenance
- etc.

### Why n* Matters
The optimal intervention point (n*) is the critical threshold:
- **Before n*:** Wait (no maintenance needed)
- **At n*:** Perform preventive maintenance
- **After n*:** Risk increases, cost increases

## Common Questions

### Q: Why doesn't the table show corrective maintenance?
**A:** The table only shows yellow/not-red state decisions because:
- Corrective maintenance (red state) is mandatory after failure
- Users need to know WHEN to prevent failure, not what to do after
- Mixing preventive and corrective is confusing

### Q: What does "Yellow Level" mean?
**A:** Yellow Level n represents:
- A decision period in the not-red (yellow) state
- Time since last maintenance before failure occurs
- The system is still operational but aging

### Q: Why does the table stop after n*?
**A:** After the optimal intervention point:
- You should perform maintenance
- System resets to n=0
- Continuing the table would be redundant

### Q: Can I change the parameters?
**A:** Yes! Adjust parameters in Model Setup to see how:
- Higher preventive cost → later intervention
- Higher corrective cost → earlier intervention
- More components → different reliability
- Higher deterioration → more frequent maintenance

## Troubleshooting

### Backend not responding
- Check if Python server is running: `python backend/main.py`
- Verify port 8000 is not in use
- Check CORS settings in backend/main.py

### Frontend shows mock data
- Backend must be running and accessible
- Check API endpoint in `src/app/utils/mdpSolver.ts`
- Check browser console for network errors

### Unexpected results
- Verify input parameters are reasonable
- Check backend logs for errors
- Review backend/CORRECTIONS.md for calculation details

## Next Steps

1. **Experiment with Parameters**
   - Try different cost structures
   - Vary number of components
   - Change deterioration rates

2. **Read the Documentation**
   - `backend/README.md` - API details
   - `backend/CORRECTIONS.md` - Calculation explanations
   - Model Explanation page - POMDP overview

3. **Deploy to Production**
   - Deploy backend to cloud (AWS, Heroku, etc.)
   - Update frontend API endpoint
   - Configure CORS for your domain
   - Deploy frontend (Vercel, Netlify, etc.)

## Support

For issues or questions:
- Check backend/CORRECTIONS.md for calculation details
- Review backend/README.md for API documentation
- Check browser console for frontend errors
- Check backend logs for API errors

## Summary

You now have a fully functional Maintenance Optimization Tool with:
✅ Corrected backend calculations
✅ Clean, modern UI with blue/navy color scheme
✅ Accurate KPI metrics
✅ Clear yellow/red state terminology
✅ Policy table showing optimal intervention threshold
✅ Interactive charts with n* markers
✅ Comprehensive documentation

The tool helps users answer:
**"When should I perform preventive maintenance?"**
→ At Yellow Level n* = [value]
