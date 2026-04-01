import { SystemParameters } from '../components/ParameterInput';

export interface OptimizationResult {
  optimalPolicy: number[];
  costByState: number[];
  totalCost: number;
  iterations: number[];
  stateDescriptions: number[][];
  probNotRed: number;
  maxInterventionLevel: number;
  avgInterventionLevel: number;
}

/**
 * Calls the backend API to solve the MDP optimization problem.
 * Epsilon is hardcoded to 0.01 on the backend side.
 */
export async function solveMDP(params: SystemParameters): Promise<OptimizationResult> {
  const API_ENDPOINT = 'http://localhost:8000/api/optimize';

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result: OptimizationResult = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to fetch from real backend:', error);
    throw error;
  }
}
