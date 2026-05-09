# Backend API Integration Guide

## Overview
This application is designed to call a backend MDP optimization service. The frontend collects user parameters and sends them to your backend API for processing.

## API Endpoint Configuration

Update the `API_ENDPOINT` in `/src/app/utils/mdpSolver.ts`:

```typescript
const API_ENDPOINT = 'https://your-backend-domain.com/api/optimize';
```

## Expected API Contract

### Request Format
**POST** to your optimization endpoint

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_TOKEN (if needed)
```

**Request Body:**
```json
{
  "numComponents": 5,
  "maxDeteriorationLevel": 4,
  "numEnvironmentStates": 3,
  "repairRate": 0.8,
  "deteriorationProbability": 0.3,
  "preventiveMaintenanceCost": 100,
  "correctiveMaintenanceCost": 500,
  "failureCost": 1000,
  "operationCost": 50,
  "fixedRepairCost": 200,
  "repairCostPerLevel": 75,
  "replacementCost": 2000,
  "discountFactor": 0.95
}
```

### Response Format
**Status:** 200 OK

**Response Body:**
```json
{
  "optimalPolicy": [0, 1, 2, 1, 0, ...],
  "costByState": [150.5, 220.3, 450.8, ...],
  "totalCost": 285.67,
  "iterations": [10.5, 5.2, 2.1, 0.5, 0.1]
}
```

### Field Descriptions

**Request Parameters:**
- `numComponents`: Number of components in the system (integer)
- `maxDeteriorationLevel`: Maximum deterioration level for components (integer)
- `numEnvironmentStates`: Number of environmental conditions (integer)
- `repairRate`: Success rate of repair operations (0-1)
- `deteriorationProbability`: Probability of component deterioration per time step (0-1)
- `preventiveMaintenanceCost`: Cost of preventive maintenance ($)
- `correctiveMaintenanceCost`: Cost of corrective maintenance ($)
- `failureCost`: Cost incurred when system fails ($)
- `operationCost`: Cost of operating the system per time step ($)
- `fixedRepairCost`: Fixed cost for any repair action ($)
- `repairCostPerLevel`: Variable cost per deterioration level repaired ($)
- `replacementCost`: Cost to replace a component completely ($)
- `discountFactor`: Discount factor for future costs (0-1)

**Response Fields:**
- `optimalPolicy`: Array of optimal actions for each state
  - 0 = Do Nothing
  - 1 = Preventive Maintenance
  - 2 = Corrective Maintenance
- `costByState`: Expected cost for each state (array of numbers)
- `totalCost`: Average expected cost across all states (number)
- `iterations`: Convergence history showing max value change per iteration (array of numbers)

## Authentication

If your backend requires authentication, update the fetch headers in `mdpSolver.ts`:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${YOUR_API_TOKEN}`,
  // or other auth headers as needed
}
```

## Error Handling

The application includes error handling for:
- Network failures
- API errors (non-200 status codes)
- Invalid response formats

Currently, if the API call fails, the app falls back to mock data for testing purposes. Remove the `generateMockResult` function when your backend is ready.

## CORS Considerations

Ensure your backend API includes appropriate CORS headers:

```
Access-Control-Allow-Origin: https://your-frontend-domain.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Testing

1. Mock data is currently enabled for development
2. Update `API_ENDPOINT` with your backend URL
3. Remove or comment out the mock fallback in the catch block when ready for production
4. Test with real backend responses

## Example Backend Implementation (Python/Flask)

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app)

@app.route('/api/optimize', methods=['POST'])
def optimize():
    params = request.json

    # Your MDP solver implementation here
    result = solve_mdp(
        num_components=params['numComponents'],
        max_deterioration_level=params['maxDeteriorationLevel'],
        num_environment_states=params['numEnvironmentStates'],
        repair_rate=params['repairRate'],
        deterioration_prob=params['deteriorationProbability'],
        preventive_cost=params['preventiveMaintenanceCost'],
        corrective_cost=params['correctiveMaintenanceCost'],
        failure_cost=params['failureCost'],
        operation_cost=params['operationCost'],
        fixed_repair_cost=params['fixedRepairCost'],
        repair_cost_per_level=params['repairCostPerLevel'],
        replacement_cost=params['replacementCost'],
        discount_factor=params['discountFactor']
    )

    return jsonify({
        'optimalPolicy': result['policy'].tolist(),
        'costByState': result['costs'].tolist(),
        'totalCost': float(result['total_cost']),
        'iterations': result['iterations'].tolist()
    })
```

## Support

For questions about the API integration, refer to your backend development team or documentation.
