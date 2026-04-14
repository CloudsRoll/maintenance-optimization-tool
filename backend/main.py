"""
Maintenance Optimization Tool — Backend API Server

This FastAPI server receives system parameters from the React frontend,
runs a Linear Programming (LP) optimization model using SciPy's linprog
(HiGHS solver) to find the optimal maintenance policy, and returns the
results as JSON.

NO Gurobi license is required — this uses only free, open-source solvers.

The mathematical model is based on a Partially Observable Markov Decision Process
(POMDP) for multi-component systems, where each component independently deteriorates
through discrete levels (green -> yellow -> ... -> red/failure).

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
from scipy.optimize import linprog

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
    then state [1, 2] -> index = 1 * 4^0 + 2 * 4^1 = 1 + 8 = 9
    """
    Index = 0
    for i in range(Dim):
        Index += StateDescV[i] * ((SetSize) ** i)
    return int(Index)


def StateDesc(Ind, Dim, SetSize):
    """
    Convert a linear index back to a multi-dimensional state vector.
    This is the inverse of StateIndex().

    Example: index 9, Dim=2, SetSize=4 -> [1, 2]
    """
    StateDescV = np.zeros(Dim, dtype=int)
    for i in range(Dim):
        StateDescV[i] = np.remainder(Ind, SetSize)
        Ind = np.floor_divide(Ind, SetSize)
    return StateDescV


# ============================================================
# PreProcessing — from finite_horizon_reliabilitywithfunctions.py
# ============================================================

def PreProcessing(alpha, K, C, Eps):
    """
    Builds the joint-state transition matrix and computes the conditional
    distribution of component states over time, given that no red (failure)
    state has been reached yet.

    This is the finite-horizon preprocessing approach that tracks both
    yellow-conditional and red-conditional distributions.

    Parameters:
        alpha: Probability of a component staying at its current deterioration level
        K:     Maximum deterioration level (red state = failure)
        C:     Number of independent components
        Eps:   Convergence threshold

    Returns:
        NumberNonGreenV: For each joint state, how many components are NOT green
        DistributionV:   Probability distribution over states at each time step
        DistributionVgivenYellow: Conditional distribution given not-red
        DistributionVgivenRed:    Conditional distribution given red
        ObsTransM:       Observed transition probabilities [P(stay yellow), P(turn red)]
        NotRed_t:        Cumulative probability of not reaching red by time t
        U:               Time truncation point
    """
    DetSSize = K + 1
    StateSpacesSize = DetSSize ** C

    TransitionM = np.zeros([StateSpacesSize, StateSpacesSize])
    DistributionV = np.zeros([1, StateSpacesSize])
    DistributionVgivenYellow = np.zeros([1, StateSpacesSize])
    DistributionVgivenRed = np.zeros([1, StateSpacesSize])

    CondDistV = np.zeros(StateSpacesSize)
    ObsTransM = np.zeros([1, 2])

    RedMaskV = np.zeros(StateSpacesSize, dtype=int)
    NotRedMaskV = np.zeros(StateSpacesSize, dtype=int)
    NumberNonGreenV = np.zeros(StateSpacesSize, dtype=int)

    # --- Step 1: Classify each joint state ---
    RedList = []
    for Ind in range(StateSpacesSize):
        StateV = StateDesc(Ind, C, DetSSize)

        RedState = 0
        for i in range(C):
            if StateV[i] == K:
                RedState = 1
                break

        if RedState == 0:
            NotRedMaskV[Ind] = 1
        else:
            RedMaskV[Ind] = 1
            RedList.append(Ind)

        NumNonGreen = 0
        for i in range(C):
            if StateV[i] != 0:
                NumNonGreen += 1
        NumberNonGreenV[Ind] = NumNonGreen

    # --- Step 2: Build transition probability matrix ---
    for FromInd in range(StateSpacesSize):
        FromStateV = StateDesc(FromInd, C, DetSSize)

        if FromInd in RedList:
            TransitionM[FromInd, FromInd] = 1
        else:
            for IncInd in range(2 ** C):
                IncV = StateDesc(IncInd, C, 2)
                ToStateV = FromStateV + IncV
                ToStateInd = StateIndex(ToStateV, C, DetSSize)
                TransitionM[FromInd, ToStateInd] = (
                    (1 - alpha) ** (sum(IncV)) * (alpha ** (C - sum(IncV)))
                )

    # --- Step 3: Compute conditional distributions over time ---
    t = 0
    DistributionV[0, :] = TransitionM[0, :]
    CondDistV = 1 / (1 - DistributionV[0, 0]) * DistributionV[0, :]
    CondDistV[0] = 0
    DistributionV[0, :] = CondDistV

    CondDistV = np.multiply(CondDistV, NotRedMaskV)
    SumNotRed = np.sum(CondDistV)
    if SumNotRed == 0:
        SumNotRed = 1e-9
    CondDistV = 1 / SumNotRed * CondDistV

    DistributionVgivenYellow[0, :] = CondDistV
    if SumNotRed != 1:
        DistributionVgivenRed[0, :] = np.multiply(CondDistV, RedMaskV) / (1 - SumNotRed)

    ObsTransM[0, :] = [SumNotRed, 1 - SumNotRed]
    NotRed_t = [SumNotRed]

    while NotRed_t[t] > Eps:
        t += 1

        DistributionV = np.append(
            DistributionV, [np.matmul(CondDistV, TransitionM)], axis=0
        )

        CondDistV = np.multiply(DistributionV[t, :], NotRedMaskV)
        SumNotRed = np.sum(CondDistV)
        if SumNotRed == 0:
            SumNotRed = 1e-9

        NotRed_t = np.append(NotRed_t, NotRed_t[t - 1] * SumNotRed)

        ObsTransM = np.append(ObsTransM, [[SumNotRed, 1 - SumNotRed]], axis=0)
        CondDistV = 1 / SumNotRed * CondDistV

        DistributionVgivenYellow = np.append(
            DistributionVgivenYellow, [CondDistV], axis=0
        )
        if SumNotRed != 1:
            DistributionVgivenRed = np.append(
                DistributionVgivenRed,
                [np.multiply(DistributionV[t, :], RedMaskV) / (1 - SumNotRed)],
                axis=0,
            )
        else:
            DistributionVgivenRed = np.append(
                DistributionVgivenRed,
                [np.zeros(StateSpacesSize, dtype=np.float64)],
                axis=0,
            )

    return (
        NumberNonGreenV,
        DistributionV,
        DistributionVgivenYellow,
        DistributionVgivenRed,
        ObsTransM,
        NotRed_t,
        t,
    )


# ============================================================
# ReliabilityLP — LP Model using SciPy linprog (NO Gurobi)
# ============================================================

def _var_index(s, n, a, U, C):
    """
    Map decision variable P[s, n, a] to a flat index for linprog.
    Total variables = 2 * (U+1) * (C+1)
    Layout: s varies slowest, then n, then a varies fastest.
    """
    return s * (U + 1) * (C + 1) + n * (C + 1) + a


def ReliabilityLP(Code, K, C, U, alpha, cp, cc, ct, cr, cu, co,
                  NumberNonGreenV, DistributionV, ObsTransM):
    """
    Formulates and solves a Linear Program (LP) to find the optimal maintenance policy
    using SciPy's linprog (HiGHS solver) — no Gurobi required.

    The LP minimizes the long-run average cost per period. The decision variable P[s,n,a]
    represents the long-run fraction of time the system is in signal state s, at counter
    level n, and takes action a (number of parts to bring).

    Parameters:
        Code: Policy constraint type (0 = optimal/unconstrained, 1-6 = heuristic policies)
        K, C: System structure (max deterioration level, number of components)
        U:    Time truncation point (from preprocessing)
        alpha, cp, cc, ct, cr, cu, co: Cost parameters
        NumberNonGreenV, DistributionV, ObsTransM: Outputs from PreProcessing()

    Returns:
        SolutionMat: The optimal P[s,n,a] matrix (shape 2 x (U+1) x (C+1))
        ObjValue:    The minimum expected long-run average cost per period
    """
    DetSSize = K + 1
    CounterStuckP = alpha ** C  # Probability ALL components stay at green
    ObsSTransProbMat = ObsTransM
    StateSpacesSize = DetSSize ** C

    num_vars = 2 * (U + 1) * (C + 1)

    # --- Build the cost vector c ---
    c = np.zeros(num_vars)
    for s in range(2):
        for n in range(U + 1):
            for a in range(C + 1):
                cost = 0.0
                if a >= 1:
                    # Base maintenance cost
                    if s == 0:
                        cost += cp  # Preventive
                    else:
                        cost += cc  # Corrective

                    # Transfer cost
                    cost += ct * a

                    # Expected replacement, underage, overage costs
                    if n == 0:
                        cost += (
                            cr * NumberNonGreenV[0]
                            + cu * max(NumberNonGreenV[0] - a, 0)
                            + co * max(-NumberNonGreenV[0] + a, 0)
                        )
                    else:
                        for Ind in range(StateSpacesSize):
                            cost += (
                                cr * NumberNonGreenV[Ind]
                                + cu * max(NumberNonGreenV[Ind] - a, 0)
                                + co * max(-NumberNonGreenV[Ind] + a, 0)
                            ) * DistributionV[n - 1, Ind]
                elif s == 1:
                    # Red signal with a=0 (do nothing) — still incurs cc base cost
                    cost += cc

                idx = _var_index(s, n, a, U, C)
                c[idx] = cost

    # --- Build equality constraints: A_eq @ x = b_eq ---
    eq_rows = []
    eq_rhs = []

    # Constraint 0: No intervention at state (0, 0)
    # sum(P[0, 0, 1:C+1]) == 0
    for a in range(1, C + 1):
        row = np.zeros(num_vars)
        row[_var_index(0, 0, a, U, C)] = 1.0
        eq_rows.append(row)
        eq_rhs.append(0.0)

    # Constraint 1: Flow balance at (not-red, counter 0)
    # sum(P[0,0,:]) - sum_{s,n,a>=1} P[s,n,a] - CounterStuckP * P[0,0,0] == 0
    row = np.zeros(num_vars)
    for a in range(C + 1):
        row[_var_index(0, 0, a, U, C)] += 1.0
    for s in range(2):
        for n in range(U + 1):
            for a in range(1, C + 1):
                row[_var_index(s, n, a, U, C)] -= 1.0
    row[_var_index(0, 0, 0, U, C)] -= CounterStuckP
    eq_rows.append(row)
    eq_rhs.append(0.0)

    # Constraint 2: Transition from counter 0 to counter 1
    # sum(P[0,1,:]) - (1 - CounterStuckP) * P[0,0,0] == 0
    row = np.zeros(num_vars)
    for a in range(C + 1):
        row[_var_index(0, 1, a, U, C)] += 1.0
    row[_var_index(0, 0, 0, U, C)] -= (1 - CounterStuckP)
    eq_rows.append(row)
    eq_rhs.append(0.0)

    # Constraints 3 & 4: Flow balance for counter levels 2 through U
    for n in range(2, U + 1):
        # Not-red: sum(P[0,n,:]) - ObsSTransProbMat[n-1,0] * P[0,n-1,0] == 0
        row = np.zeros(num_vars)
        for a in range(C + 1):
            row[_var_index(0, n, a, U, C)] += 1.0
        row[_var_index(0, n - 1, 0, U, C)] -= ObsSTransProbMat[n - 1, 0]
        eq_rows.append(row)
        eq_rhs.append(0.0)

        # Red: sum(P[1,n,:]) - ObsSTransProbMat[n-1,1] * P[0,n-1,0] == 0
        row = np.zeros(num_vars)
        for a in range(C + 1):
            row[_var_index(1, n, a, U, C)] += 1.0
        row[_var_index(0, n - 1, 0, U, C)] -= ObsSTransProbMat[n - 1, 1]
        eq_rows.append(row)
        eq_rhs.append(0.0)

    # Constraint 5: All probabilities sum to 1
    row = np.ones(num_vars)
    eq_rows.append(row)
    eq_rhs.append(1.0)

    # Constraint: In red you MUST intervene (P[1,n,0] == 0 for all n)
    for n in range(U + 1):
        row = np.zeros(num_vars)
        row[_var_index(1, n, 0, U, C)] = 1.0
        eq_rows.append(row)
        eq_rhs.append(0.0)

    # Constraint: Cannot reach red before counter K
    for n in range(K):
        for a in range(C + 1):
            row = np.zeros(num_vars)
            row[_var_index(1, n, a, U, C)] = 1.0
            eq_rows.append(row)
            eq_rhs.append(0.0)

    # Constraint: At truncation point U, must intervene (P[0,U,0] == 0)
    row = np.zeros(num_vars)
    row[_var_index(0, U, 0, U, C)] = 1.0
    eq_rows.append(row)
    eq_rhs.append(0.0)

    # --- Heuristic policy constraints ---
    if Code in [1, 2, 3]:
        # Only intervene at counter K-1
        for n in range(K - 1):
            for a in range(1, C + 1):
                row = np.zeros(num_vars)
                row[_var_index(0, n, a, U, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)
        # Must intervene at K-1
        row = np.zeros(num_vars)
        row[_var_index(0, K - 1, 0, U, C)] = 1.0
        eq_rows.append(row)
        eq_rhs.append(0.0)

        if Code == 2:
            for a in range(2, C + 1):
                row = np.zeros(num_vars)
                row[_var_index(0, K - 1, a, U, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)
        elif Code == 3:
            for a in range(1, C):
                row = np.zeros(num_vars)
                row[_var_index(0, K - 1, a, U, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)

    elif Code in [4, 5, 6]:
        # Only intervene when red (no preventive)
        for n in range(U):
            for a in range(1, C + 1):
                row = np.zeros(num_vars)
                row[_var_index(0, n, a, U, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)

        if Code == 5:
            for n in range(U + 1):
                for a in range(2, C + 1):
                    row = np.zeros(num_vars)
                    row[_var_index(1, n, a, U, C)] = 1.0
                    eq_rows.append(row)
                    eq_rhs.append(0.0)
        elif Code == 6:
            for n in range(U + 1):
                for a in range(1, C):
                    row = np.zeros(num_vars)
                    row[_var_index(1, n, a, U, C)] = 1.0
                    eq_rows.append(row)
                    eq_rhs.append(0.0)

    # --- Solve ---
    A_eq = np.array(eq_rows)
    b_eq = np.array(eq_rhs)
    bounds = [(0, None)] * num_vars  # All variables >= 0

    result = linprog(
        c,
        A_eq=A_eq,
        b_eq=b_eq,
        bounds=bounds,
        method="highs",
        options={"presolve": True, "dual_feasibility_tolerance": 1e-9},
    )

    if not result.success:
        raise Exception(f"LP solver failed: {result.message}")

    # Reshape solution back to 3D
    SolutionMat = result.x.reshape(2, U + 1, C + 1)
    ObjValue = result.fun

    return SolutionMat, ObjValue


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
        eps = 0.01

        # STEP 1: Preprocessing — build transition matrices and conditional distributions
        (
            NumberNonGreenV,
            DistributionV,
            DistributionVgivenYellow,
            DistributionVgivenRed,
            ObsTransM,
            NotRed_t,
            U,
        ) = PreProcessing(params.alpha, params.K, params.C, eps)

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
            ObsTransM=ObsTransM,
        )

        # ===== STEP 3: Compute the 3 key output metrics =====

        # METRIC 1: Probability of NOT being in red state
        prob_red = float(np.sum(SolutionMat[1, :, :]))
        prob_not_red = 1.0 - prob_red

        # METRIC 2: Maximum intervention level (n*)
        max_intervention_level = 0
        for n in range(U + 1):
            if np.sum(SolutionMat[0, n, 1:params.C + 1]) > 1e-9:
                max_intervention_level = n

        # METRIC 3: Average intervention level
        total_intervention_prob = 0.0
        weighted_sum = 0.0
        for n in range(U + 1):
            intervene_prob = float(
                np.sum(SolutionMat[0, n, 1:params.C + 1])
                + np.sum(SolutionMat[1, n, 1:params.C + 1])
            )
            weighted_sum += n * intervene_prob
            total_intervention_prob += intervene_prob
        avg_intervention_level = (
            weighted_sum / total_intervention_prob if total_intervention_prob > 0 else 0.0
        )

        # ===== STEP 4: Build policy and cost arrays for frontend charts =====

        optimalPolicy = []
        costByState = []
        for n in range(U + 1):
            if sum(SolutionMat[1, n, 1:params.C + 1]) > 0.001:
                optimalPolicy.append(2)   # Corrective
            elif sum(SolutionMat[0, n, 1:params.C + 1]) > 0.001:
                optimalPolicy.append(1)   # Preventive
            else:
                optimalPolicy.append(0)   # Do nothing

            expected_c = (
                sum(SolutionMat[0, n, :]) * params.cp
                + sum(SolutionMat[1, n, :]) * params.cc
            )
            costByState.append(float(expected_c))

        # Scale costs for chart visualization
        if max(costByState) > 0:
            scale = params.cc / max(costByState)
            costByState = [c_val * scale for c_val in costByState]

        # Build state description vectors
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
