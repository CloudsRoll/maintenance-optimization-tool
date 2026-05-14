import { SystemParameters } from '../components/ParameterInput';

export interface TableRow {
  decisionPeriod: number;
  signalState: string;  // "Green" | "Yellow" | "Red"
  recommendedAction: string;
  actionType: string;
  expectedCost: number;
  probability: number;
  interventionProbability: number;
  optimalSpareParts?: number;
}

export interface SparePartDataPoint {
  period: number;
  preventiveParts?: number;
  correctiveParts?: number;
}

export interface ExpectedStateCost {
  green: number;
  yellow: number;
  red: number;
  greenProb: number;
  yellowProb: number;
  redProb: number;
}

export interface OptimizationResult {
  optimalPolicy: number[];
  costByState: number[];
  totalCost: number;
  iterations: number[];
  probNotRed: number;
  maxInterventionLevel: number;
  avgInterventionLevel: number;
  stateDescriptions: number[][];
  tableRows?: TableRow[];
  sparePartsData?: SparePartDataPoint[];
  expectedStateCost?: ExpectedStateCost;
}

/**
 * Calls the backend API to solve the MDP optimization problem
 */
export async function solveMDP(params: SystemParameters): Promise<OptimizationResult> {
  const API_ENDPOINT = 'http://localhost:8000/api/optimize';

  const backendParams = {
    alpha: params.selfTransitionProbability,
    K: params.maxDeteriorationLevel,
    C: params.numComponents,
    cp: params.preventiveMaintenanceCost,
    cc: params.correctiveMaintenanceCost,
    ct: params.transferCostPerComponent,
    cr: params.replacementCostPerNonGreen,
    cu: params.underageCost,
    co: params.overageCost,
    cs: params.sparePartCost ?? 0,
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: OptimizationResult = await response.json();
    return result;
  } catch (error) {
    console.log('Using mock data - backend API not yet connected:', error);
    return generateMockResult(params);
  }
}

/**
 * Generates mock optimization results for testing
 */
function generateMockResult(params: SystemParameters): OptimizationResult {
  const U = params.maxDeteriorationLevel + 5;

  const optimalPolicy = Array.from({ length: U + 1 }, (_, n) => {
    if (n < params.maxDeteriorationLevel - 1) return 0;
    if (n < params.maxDeteriorationLevel) return 1;
    return 2;
  });

  const costByState = Array.from({ length: U + 1 }, (_, n) => {
    if (n < params.maxDeteriorationLevel - 1) return 0;
    if (n < params.maxDeteriorationLevel) return params.preventiveMaintenanceCost;
    return params.correctiveMaintenanceCost;
  });

  const totalCost =
    params.preventiveMaintenanceCost * 0.6 +
    params.correctiveMaintenanceCost * 0.3 +
    params.transferCostPerComponent * params.numComponents * 0.5;

  const iterations = [totalCost * 1.5, totalCost * 1.3, totalCost * 1.1, totalCost];

  const StateSpacesSize = Math.pow(params.maxDeteriorationLevel + 1, params.numComponents);
  const stateDescriptions: number[][] = [];
  for (let i = 0; i < Math.min(StateSpacesSize, 100); i++) {
    const state = Array.from({ length: params.numComponents }, () =>
      Math.floor(Math.random() * (params.maxDeteriorationLevel + 1))
    );
    stateDescriptions.push(state);
  }

  const mockMaxIntervention = params.maxDeteriorationLevel - 1;
  const tableRows: TableRow[] = [];
  for (let n = 0; n <= mockMaxIntervention; n++) {
    const isIntervention = n === mockMaxIntervention;
    const signalNotRed = n === 0 ? 'Green' : 'Yellow';

    tableRows.push({
      decisionPeriod: n,
      signalState: signalNotRed,
      recommendedAction: isIntervention ? 'Perform Maintenance' : 'Wait',
      actionType: isIntervention ? 'Preventive Maintenance' : 'No Action',
      expectedCost: isIntervention ? params.preventiveMaintenanceCost : 0,
      probability: n === 0 ? 0.20 : 0.20 * Math.exp(-n * 0.25),
      interventionProbability: isIntervention ? 0.85 : 0.0,
      optimalSpareParts: isIntervention ? Math.ceil(params.numComponents * 0.6) : 0,
    });

    tableRows.push({
      decisionPeriod: n,
      signalState: 'Red',
      recommendedAction: 'Perform Maintenance',
      actionType: 'Corrective Maintenance',
      expectedCost: params.correctiveMaintenanceCost,
      probability: n === 0 ? 0 : 0.05 * Math.exp(n * 0.1),
      interventionProbability: 1.0,
      optimalSpareParts: params.numComponents,
    });
  }

  const sparePartsData: SparePartDataPoint[] = [
    { period: mockMaxIntervention, preventiveParts: Math.ceil(params.numComponents * 0.6) },
    { period: mockMaxIntervention + 1, correctiveParts: params.numComponents },
  ];

  const expectedStateCost: ExpectedStateCost = {
    green: 0,
    yellow: params.preventiveMaintenanceCost * 0.3,
    red: params.correctiveMaintenanceCost,
    greenProb: 0.15,
    yellowProb: 0.70,
    redProb: 0.15,
  };

  return {
    optimalPolicy,
    costByState,
    totalCost,
    iterations,
    probNotRed: 1 - (1 / (params.maxDeteriorationLevel + 1)),
    maxInterventionLevel: params.maxDeteriorationLevel - 1,
    avgInterventionLevel: (params.maxDeteriorationLevel - 1) * 0.7,
    stateDescriptions,
    tableRows,
    sparePartsData,
    expectedStateCost,
  };
}
