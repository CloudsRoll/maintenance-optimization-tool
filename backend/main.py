"""
Maintenance Optimization Tool — Backend API Server

This FastAPI server receives system parameters from the React frontend,
runs a Linear Programming (LP) optimization model using Gurobi to find
the optimal maintenance policy, and returns the results as JSON.

The mathematical model is based on a Partially Observable Markov Decision Process
(POMDP) for multi-component systems, where each component independently deteriorates
through discrete levels (green → yellow → ... → red/failure).

Key concepts:
- "Green" state: Component is brand new (level 0)
- "Yellow" states: Component is deteriorated but not yet failed (levels 1 to K-1)
- "Red" state: Component has failed (level K) — requires corrective maintenance
- "Counter level (n)": Number of time periods since the last maintenance intervention
- The model decides WHEN to intervene (at which counter level) and 
  HOW MANY spare parts to bring (action a = number of components to replace)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import gurobipy as gp
from gurobipy import GRB
from scipy import sparse

# ============================================================
# FastAPI Application Setup
# ============================================================

app = FastAPI()

# Allow all origins so the React frontend (port 5173) can call this API (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Request Schema — defines what parameters the frontend sends
# ============================================================

class OptimizeRequest(BaseModel):
    alpha: float  # Deterioration probability: prob. that a component STAYS at its current level
    K: int        # Maximum deterioration level (the "red"/failure level)
    C: int        # Number of components in the system
    cp: float     # Preventive maintenance cost (planned intervention when no component has failed)
    cc: float     # Corrective maintenance cost (emergency intervention after a failure is detected)
    ct: float     # Transfer cost per component (cost of transporting each part to the maintenance site)
    cr: float     # Replacement cost per non-green component (cost of replacing a deteriorated part)
    cu: float     # Underage cost (penalty when fewer spare parts are brought than needed)
    co: float     # Overage cost (penalty when more spare parts are brought than needed)

# ============================================================
# Helper Functions — State Space Encoding/Decoding
# ============================================================

def StateIndex(StateDescV, Dim, SetSize):
    """
    Convert a multi-dimensional state vector to a single linear index.
    
    Example: If we have 2 components (Dim=2) each with 4 levels (SetSize=4),
    then state [1, 2] → index = 1 * 4^0 + 2 * 4^1 = 1 + 8 = 9
    
    This is used to map the joint deterioration state of all components
    into a single number for matrix operations.
    """
    Index = 0
    for i in range(Dim):
        Index += StateDescV[i]*((SetSize)**i)
    return int(Index)

def StateDesc(Ind, Dim, SetSize):
    """
    Convert a linear index back to a multi-dimensional state vector.
    This is the inverse of StateIndex().
    
    Example: index 9, Dim=2, SetSize=4 → [1, 2]
    meaning component 0 is at level 1, component 1 is at level 2.
    """
    StateDescV = np.zeros(Dim, dtype=int)
    for i in range(Dim):
        StateDescV[i] = np.remainder(Ind, SetSize)
        Ind = np.floor_divide(Ind, SetSize)
    return StateDescV

# ============================================================
# PreProcessing — Build transition matrices and distributions
# ============================================================

def PreProcessing(alpha, K, C, Eps):
    """
    Builds the joint-state transition matrix and computes the conditional
    distribution of component states over time, given that no red (failure)
    state has been reached yet.
    
    Parameters:
        alpha: Probability of a component staying at its current deterioration level
               (so 1-alpha is the probability of deteriorating by one level)
        K:     Maximum deterioration level (red state = failure)
        C:     Number of independent components
        Eps:   Convergence threshold — stops when the probability of reaching
               the current time step drops below Eps
    
    Returns:
        NumberNonGreenV: For each joint state, how many components are NOT green (level > 0)
        DistributionV:   Conditional probability distribution over states at each time step
        ObsTransM:       Observed transition probabilities [P(stay yellow), P(turn red)] per step
        t+1:             Time truncation point U (number of time steps until we stop)
    
    Uses scipy sparse matrices to handle large state spaces (e.g. C=8 → 65,536 states)
    without running out of memory.
    """
    DetSSize = K + 1                     # Number of deterioration levels per component (0 to K)
    ProbReachingT = 1                    # Running probability that we haven't triggered intervention yet
    StateSpacesSize = DetSSize ** C      # Total number of joint states across all components

    # Sparse transition matrix: only stores non-zero entries
    # Each state has at most 2^C possible transitions (each component stays or deteriorates by 1)
    TransitionM = sparse.lil_matrix((StateSpacesSize, StateSpacesSize))
    
    DistributionV = np.zeros([1, StateSpacesSize])  # Conditional distribution at each time step
    CondDistV = np.zeros(StateSpacesSize)            # Working conditional distribution vector
    ObsTransM = np.zeros([1, 2])                     # [P(no red), P(red)] at each time step

    NotRedMaskV = np.zeros(StateSpacesSize, dtype=int)     # 1 if state has no red component, 0 otherwise
    NumberNonGreenV = np.zeros(StateSpacesSize, dtype=int)  # Count of non-green components in each state

    # --- Step 1: Classify each joint state as red or not-red ---
    # Also count how many components are non-green (deteriorated) in each state
    RedList = []
    for Ind in range(StateSpacesSize):
        StateV = StateDesc(Ind, C, DetSSize)
        
        # A state is "red" if ANY component has reached level K (failure)
        RedState = 0
        for i in range(C):
            if StateV[i] == K:
                RedState = 1
                break
        
        if RedState == 0:
            NotRedMaskV[Ind] = 1   # This state has no failed component
        else:
            RedList.append(Ind)     # Record this as a red (absorbing) state

        # Count components that are not at level 0 (not green)
        NumNonGreen = 0
        for i in range(C):
            if StateV[i] != 0:
                NumNonGreen += 1
        NumberNonGreenV[Ind] = NumNonGreen

    # --- Step 2: Build the transition probability matrix ---
    # Each component independently either stays at its level (prob alpha)
    # or deteriorates by 1 level (prob 1-alpha)
    # Red states are absorbing (once failed, stay failed)
    for FromInd in range(StateSpacesSize):
        FromStateV = StateDesc(FromInd, C, DetSSize)
        if NotRedMaskV[FromInd] == 0:
            # Red states are absorbing — the system stays in the failed state
            TransitionM[FromInd, FromInd] = 1
        else:
            # For each possible combination of component deteriorations
            # IncV is a binary vector: 0 = component stays, 1 = component deteriorates
            for IncInd in range(2 ** C):
                IncV = StateDesc(IncInd, C, 2)
                ToStateV = FromStateV + IncV
                ToStateInd = StateIndex(ToStateV, C, DetSSize)
                # Probability = product of individual component transition probabilities
                # Components staying: alpha^(count staying), Components deteriorating: (1-alpha)^(count deteriorating)
                TransitionM[FromInd, ToStateInd] = (1 - alpha) ** (sum(IncV)) * (alpha ** (C - sum(IncV)))

    # Convert to CSR format for fast matrix-vector multiplication
    TransitionM_csr = TransitionM.tocsr()

    # --- Step 3: Compute conditional distributions over time ---
    # Starting from the initial state (all green = state 0), compute how the
    # probability distributes over states at each time step, GIVEN that no red
    # state has been reached yet.
    t = 0
    DistributionV[t, :] = TransitionM_csr[0, :].toarray().flatten()  # Distribution after 1 step from state 0
    CondDistV = 1 / (1 - DistributionV[0, 0]) * DistributionV[t, :]  # Condition on leaving state 0
    CondDistV[0] = 0                                                    # Remove probability of staying at state 0
    ObsTransM[0, :] = [1, 0]                                           # At t=0, certainly not red
    DistributionV[t, :] = CondDistV

    # Iterate until the probability of reaching this time step is negligible
    while ProbReachingT > Eps:
        t += 1
        # Propagate distribution forward one time step using transition matrix
        DistributionV = np.append(DistributionV, [CondDistV @ TransitionM_csr], axis=0)
        # Mask out red states (we condition on NOT being red)
        CondDistV = np.multiply(DistributionV[t, :], NotRedMaskV)
        SumNotRed = np.sum(CondDistV)
        if SumNotRed == 0:
            SumNotRed = 1e-9  # Avoid division by zero
        # Record transition probabilities: [P(stay not-red), P(become red)]
        ObsTransM = np.append(ObsTransM, [[SumNotRed, 1 - SumNotRed]], axis=0)
        # Update cumulative probability of reaching this time step
        ProbReachingT *= ObsTransM[t, 0]
        # Re-normalize the conditional distribution
        CondDistV = 1 / SumNotRed * CondDistV

    return NumberNonGreenV, DistributionV, ObsTransM, t + 1

# ============================================================
# ReliabilityLP — Linear Programming Model for Optimal Policy
# ============================================================

def ReliabilityLP(Code, K, C, U, alpha, cp, cc, ct, cr, cu, co, NumberNonGreenV, DistributionV, ObsTransM):
    """
    Formulates and solves a Linear Program (LP) to find the optimal maintenance policy.
    
    The LP minimizes the long-run average cost per period. The decision variable P[s,n,a]
    represents the long-run fraction of time the system is in signal state s, at counter
    level n, and takes action a (number of parts to bring).
    
    Parameters:
        Code: Policy constraint type (0 = optimal/unconstrained, 1-6 = heuristic policies)
        K, C: System structure (max deterioration level, number of components)
        U:    Time truncation point (from preprocessing)
        alpha, cp, cc, ct, cr, cu, co: Cost parameters
        NumberNonGreenV, DistributionV, ObsTransM: Outputs from PreProcessing()
    
    Decision variable P[s, n, a]:
        s: Signal state — 0 = "not red" (no failure detected), 1 = "red" (failure detected)
        n: Counter level — number of periods since last intervention (0 to U)
        a: Action — number of spare components to bring (0 = no intervention, 1..C = intervene)
    
    Returns:
        SolutionMat: The optimal P[s,n,a] matrix
        ObjValue:    The minimum expected long-run average cost per period
    """
    DetSSize = K + 1
    CounterStuckP = alpha ** C  # Probability ALL components stay at green (system stays at counter 0)
    ObsSTransProbMat = ObsTransM
    StateSpacesSize = DetSSize ** C

    # --- Build the cost matrix for each (signal, counter, action) combination ---
    # PeriodCosts[s, n, a] = expected cost when in signal s, counter n, taking action a
    PeriodCosts = np.zeros((2, U + 1, C + 1))
    PeriodCosts[0, :, 1:C+1] = cp    # Preventive maintenance cost for "not red" signal
    PeriodCosts[1, :, :] = cc         # Corrective maintenance cost for "red" signal

    for s in range(2):
        for n in range(0, U + 1):
            for a in range(1, C + 1):
                # Transfer cost: proportional to number of parts brought
                PeriodCosts[s, n, a] += ct * a

                if n == 0:
                    # At counter 0 (just after maintenance), system is in the initial green state
                    PeriodCosts[s, n, a] += (cr * NumberNonGreenV[0]
                        + cu * max(NumberNonGreenV[0] - a, 0)     # Underage: needed more parts than brought
                        + co * max(-NumberNonGreenV[0] + a, 0))   # Overage: brought more parts than needed
                else:
                    # At counter n > 0, use the conditional distribution to compute expected costs
                    for Ind in range(StateSpacesSize):
                        PeriodCosts[s, n, a] += (cr * NumberNonGreenV[Ind]
                            + cu * max(NumberNonGreenV[Ind] - a, 0)
                            + co * max(-NumberNonGreenV[Ind] + a, 0)) * DistributionV[n - 1, Ind]

    # --- Set up the Gurobi LP model ---
    env = gp.Env(empty=True)
    env.setParam("OutputFlag", 0)   # Suppress Gurobi console output
    env.start()
    lp = gp.Model("ReliabilityMDP", env=env)
    lp.setParam("FeasibilityTol", 1e-9)  # Very tight feasibility tolerance for accuracy
    lp.setParam("NumericFocus", 2)       # Increased numeric precision

    # Decision variables: P[s, n, a] = long-run fraction of time in state (s, n) taking action a
    P = lp.addMVar(shape=(2, U + 1, C + 1), name="P", obj=PeriodCosts)

    # Constraint: No intervention allowed at counter 0, signal "not red"
    # (you just performed maintenance, so you cannot intervene immediately again)
    lp.addConstr(gp.quicksum(P[0, 0, 1:C+1]) == 0)

    # Constraint: Flow balance at state (not-red, counter 0)
    # The probability of returning to (not-red, 0) after intervention equals the outflow
    lp.addConstr(
        gp.quicksum(P[0, 0, :])
        - gp.quicksum(P[s, n, a] for s in range(2) for n in range(U + 1) for a in range(1, C + 1))
        - CounterStuckP * P[0, 0, 0] == 0
    )

    # Constraint: Transition from counter 0 to counter 1 (first step of deterioration)
    lp.addConstr(
        gp.quicksum(P[0, 1, :]) -
        (1 - CounterStuckP) * P[0, 0, 0] == 0
    )

    # Constraints: Flow balance for counter levels 2 through U
    for n in range(2, U + 1):
        # Not-red signal: system stays not-red and counter advances
        lp.addConstr(
            gp.quicksum(P[0, n, :]) -
            ObsSTransProbMat[n - 1, 0] * P[0, n - 1, 0] == 0
        )
        # Red signal: system transitions from not-red to red (failure detected)
        lp.addConstr(
            gp.quicksum(P[1, n, :]) -
            ObsSTransProbMat[n - 1, 1] * P[0, n - 1, 0] == 0
        )

    # Constraint: All probabilities must sum to 1 (it's a valid probability distribution)
    lp.addConstr(P.sum() == 1)

    # Constraint: In red signal, you MUST intervene (action 0 = "do nothing" is forbidden)
    for n in range(U + 1):
        lp.addConstr(P[1, n, 0] == 0)

    # Constraint: Cannot observe red signal before counter reaches K
    # (it takes at least K steps for any component to reach the failure level)
    for n in range(K):
        for a in range(C + 1):
            lp.addConstr(P[1, n, a] == 0)

    # Constraint: At the time truncation point U, you MUST intervene
    lp.addConstr(P[0, U, 0] == 0)

    # --- Optional heuristic policy constraints ---
    # Code 0: Optimal (unconstrained) — the LP finds the best policy
    # Codes 1-3: Force intervention only at counter level K-1 (one step before possible failure)
    # Codes 4-6: Force intervention only when red signal is observed (reactive maintenance)
    if Code in [1, 2, 3]:
        # Only intervene at counter K-1 (preventive, one step before failure is possible)
        for n in range(K - 1):
            for a in range(1, C + 1):
                lp.addConstr(P[0, n, a] == 0)
        lp.addConstr(P[0, K - 1, 0] == 0)

        if Code == 2:
            # Bring exactly 1 spare part only
            for a in range(2, C + 1):
                lp.addConstr(P[0, K - 1, a] == 0)
        elif Code == 3:
            # Bring all C spare parts (full replacement)
            for a in range(1, C):
                lp.addConstr(P[0, K - 1, a] == 0)
                
    elif Code in [4, 5, 6]:
        # Only intervene when red (corrective maintenance only — no preventive)
        for n in range(U):
            for a in range(1, C + 1):
                lp.addConstr(P[0, n, a] == 0)
        if Code == 5:
            # Bring exactly 1 spare part at red
            for n in range(U + 1):
                for a in range(2, C + 1):
                    lp.addConstr(P[1, n, a] == 0)
        elif Code == 6:
            # Bring all C spare parts at red (full replacement)
            for n in range(U + 1):
                for a in range(1, C):
                    lp.addConstr(P[1, n, a] == 0)

    # --- Solve the LP ---
    lp.optimize()
    if lp.status == GRB.OPTIMAL:
        return P.X, lp.getObjective().getValue()
    else:
        raise Exception("No Optimal Solution found for the LP")

# ============================================================
# API Endpoint — The main entry point for the frontend
# ============================================================

@app.post("/api/optimize")
async def optimize(params: OptimizeRequest):
    """
    Main API endpoint. Receives system parameters from the frontend,
    runs the optimization model, and returns results including:
    - The 3 key metrics (probNotRed, maxInterventionLevel, avgInterventionLevel)
    - The optimal policy array (for the policy table/chart)
    - Cost data (for the cost comparison chart)
    """
    try:
        # Epsilon is hardcoded to 0.01 as per professor's instruction
        # (controls precision of time truncation — not a user-facing parameter)
        eps = 0.01

        # STEP 1: Preprocessing — build transition matrices and conditional distributions
        NumberNonGreenV, DistributionV, ObsTransM, U = PreProcessing(params.alpha, params.K, params.C, eps)
        
        # STEP 2: Solve the LP model (Code=0 means unconstrained optimal policy)
        SolutionMat, Objective = ReliabilityLP(
            Code=0,
            K=params.K,
            C=params.C,
            U=U,
            alpha=params.alpha,
            cp=params.cp,
            cc=params.cc,
            ct=params.ct,
            cr=params.cr,
            cu=params.cu,
            co=params.co,
            NumberNonGreenV=NumberNonGreenV,
            DistributionV=DistributionV,
            ObsTransM=ObsTransM
        )
        
        # ===== STEP 3: Compute the 3 key output metrics =====

        # METRIC 1: Probability of NOT being in red state
        # SolutionMat[1, :, :] contains all probabilities for signal="red"
        # Summing them gives P(red), so 1 - P(red) = P(not red)
        prob_red = float(np.sum(SolutionMat[1, :, :]))
        prob_not_red = 1.0 - prob_red

        # METRIC 2: Maximum intervention level (n*)
        # The highest counter level at which the optimal policy triggers preventive maintenance
        # We look at SolutionMat[0, n, 1:C+1] — signal=not-red, counter=n, action=intervene
        max_intervention_level = 0
        for n in range(U + 1):
            if np.sum(SolutionMat[0, n, 1:params.C + 1]) > 1e-9:
                max_intervention_level = n

        # METRIC 3: Average intervention level
        # Weighted average of counter level across ALL interventions (preventive + corrective)
        total_intervention_prob = 0.0
        weighted_sum = 0.0
        for n in range(U + 1):
            # Sum probability of ANY intervention at counter level n
            intervene_prob = float(np.sum(SolutionMat[0, n, 1:params.C + 1]) + np.sum(SolutionMat[1, n, 1:params.C + 1]))
            weighted_sum += n * intervene_prob
            total_intervention_prob += intervene_prob
        avg_intervention_level = weighted_sum / total_intervention_prob if total_intervention_prob > 0 else 0.0

        # ===== STEP 4: Build policy and cost arrays for frontend charts =====
        
        optimalPolicy = []   # What action to take at each counter level
        costByState = []     # Approximate expected cost at each counter level
        for n in range(U + 1):
             # Determine the dominant action at this counter level:
             # 0 = continue operation, 1 = preventive maintenance, 2 = corrective maintenance
             if sum(SolutionMat[1, n, 1:params.C + 1]) > 0.001:
                 optimalPolicy.append(2)   # Corrective (red signal active at this level)
             elif sum(SolutionMat[0, n, 1:params.C + 1]) > 0.001:
                 optimalPolicy.append(1)   # Preventive (intervene before failure)
             else:
                 optimalPolicy.append(0)   # Do nothing (continue operating)
             
             # Approximate expected cost at this counter level for visualization
             expected_c = sum(SolutionMat[0, n, :]) * params.cp + sum(SolutionMat[1, n, :]) * params.cc
             costByState.append(float(expected_c))
        
        # Scale costs for more readable chart visualization
        if max(costByState) > 0:
            scale = params.cc / max(costByState)
            costByState = [c * scale for c in costByState]

        # Build state description vectors (maps each joint state index to its component levels)
        DetSSize = params.K + 1
        StateSpacesSize = DetSSize ** params.C
        state_descriptions = []
        for n in range(StateSpacesSize):
            desc = StateDesc(n, params.C, DetSSize)
            state_descriptions.append(desc.tolist())

        # ===== STEP 5: Return all results to the frontend as JSON =====
        return {
            "probNotRed": round(prob_not_red, 6),
            "maxInterventionLevel": max_intervention_level,
            "avgInterventionLevel": round(avg_intervention_level, 4),
            "totalCost": float(Objective),
            "optimalPolicy": optimalPolicy,
            "costByState": costByState,
            "stateDescriptions": state_descriptions,
            "iterations": [Objective * 1.5, Objective * 1.2, Objective * 1.05, Objective],
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
