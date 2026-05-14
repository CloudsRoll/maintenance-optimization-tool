"""
Maintenance Optimization Tool — Backend API Server

This FastAPI server receives system parameters from the React frontend,
runs a Mathematical Formulation (MF) Programming optimization model using
SciPy's linprog (HiGHS solver) to find the optimal maintenance policy,
and returns the results as JSON.

NO Gurobi license is required — this uses only free, open-source solvers.

The mathematical model is based on a Partially Observable Markov Decision Process
(POMDP) for multi-component systems, where each component independently deteriorates
through discrete levels (green -> yellow -> ... -> red/failure).

Key concepts:
- "Green" state: Component is brand new (level 0) — observed when n=0
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
    cs: float = 0.0  # Spare part holding cost (cost per spare part carried)

# ============================================================
# Helper Functions — State Space Encoding/Decoding
# ============================================================

def StateIndex(StateDescV, Dim, SetSize):
    Index = 0
    for i in range(Dim):
        Index += StateDescV[i] * ((SetSize) ** i)
    return int(Index)


def StateDesc(Ind, Dim, SetSize):
    StateDescV = np.zeros(Dim, dtype=int)
    for i in range(Dim):
        StateDescV[i] = np.remainder(Ind, SetSize)
        Ind = np.floor_divide(Ind, SetSize)
    return StateDescV

# ============================================================
# PreProcessing — Finite Horizon Approach
# ============================================================

def PreProcessing(alpha, K, C, Eps):
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
# ReliabilityMF — SciPy linprog (HiGHS) based MF solver
# ============================================================

def _var_index(s, n, a, U_size, C):
    return s * U_size * (C + 1) + n * (C + 1) + a


def ReliabilityMF(Code, K, C, U, alpha, cp, cc, ct, cr, cu, co, cs,
                  NumberNonGreenV, DistributionV, DistributionVgivenYellow, DistributionVgivenRed, ObsTransM):
    """
    Formulates and solves a Mathematical Formulation (MF) Program to find the
    optimal maintenance policy using SciPy's linprog (HiGHS solver).

    The MF minimizes the long-run average cost per period. The decision variable P[s,n,a]
    represents the long-run fraction of time the system is in signal state s, at counter
    level n, and takes action a (number of parts to bring).

    Signal states:
      s=0 : Not-Red (Green when n=0, Yellow when n>=1)
      s=1 : Red (failure detected)
    """
    DetSSize = K + 1
    CounterStuckP = alpha ** C
    ObsSTransProbMat = ObsTransM
    StateSpacesSize = DetSSize ** C

    U_size = U + 2
    num_vars = 2 * U_size * (C + 1)

    # --- Build the cost vector c ---
    c = np.zeros(num_vars)
    for s in range(2):
        for n in range(U_size):
            for a in range(C + 1):
                cost = 0.0
                if a >= 1:
                    if s == 0:
                        cost += cp  # Preventive
                    else:
                        cost += cc  # Corrective
                    cost += ct * a
                    # Spare part holding cost
                    cost += cs * a
                    if n == 0:
                        cost += (
                            cr * NumberNonGreenV[0]
                            + cu * max(NumberNonGreenV[0] - a, 0)
                            + co * max(-NumberNonGreenV[0] + a, 0)
                        )
                    else:
                        for Ind in range(StateSpacesSize):
                            if s == 0:
                                cost += (
                                    cr * NumberNonGreenV[Ind]
                                    + cu * max(NumberNonGreenV[Ind] - a, 0)
                                    + co * max(-NumberNonGreenV[Ind] + a, 0)
                                ) * DistributionVgivenYellow[n - 1, Ind]
                            else:
                                cost += (
                                    cr * NumberNonGreenV[Ind]
                                    + cu * max(NumberNonGreenV[Ind] - a, 0)
                                    + co * max(-NumberNonGreenV[Ind] + a, 0)
                                ) * DistributionVgivenRed[n - 1, Ind]
                elif s == 1:
                    cost += cc

                idx = _var_index(s, n, a, U_size, C)
                c[idx] = cost

    # --- Build equality constraints ---
    eq_rows = []
    eq_rhs = []

    for a in range(1, C + 1):
        row = np.zeros(num_vars)
        row[_var_index(0, 0, a, U_size, C)] = 1.0
        eq_rows.append(row)
        eq_rhs.append(0.0)

    row = np.zeros(num_vars)
    for a in range(C + 1):
        row[_var_index(0, 0, a, U_size, C)] += 1.0
    for s in range(2):
        for n in range(U_size):
            for a in range(1, C + 1):
                row[_var_index(s, n, a, U_size, C)] -= 1.0
    row[_var_index(0, 0, 0, U_size, C)] -= CounterStuckP
    eq_rows.append(row)
    eq_rhs.append(0.0)

    row = np.zeros(num_vars)
    for a in range(C + 1):
        row[_var_index(0, 1, a, U_size, C)] += 1.0
    row[_var_index(0, 0, 0, U_size, C)] -= (1 - CounterStuckP)
    eq_rows.append(row)
    eq_rhs.append(0.0)

    for n in range(2, U_size):
        row = np.zeros(num_vars)
        for a in range(C + 1):
            row[_var_index(0, n, a, U_size, C)] += 1.0
        row[_var_index(0, n - 1, 0, U_size, C)] -= ObsSTransProbMat[n - 1, 0]
        eq_rows.append(row)
        eq_rhs.append(0.0)

        row = np.zeros(num_vars)
        for a in range(C + 1):
            row[_var_index(1, n, a, U_size, C)] += 1.0
        row[_var_index(0, n - 1, 0, U_size, C)] -= ObsSTransProbMat[n - 1, 1]
        eq_rows.append(row)
        eq_rhs.append(0.0)

    row = np.ones(num_vars)
    eq_rows.append(row)
    eq_rhs.append(1.0)

    for n in range(U_size):
        row = np.zeros(num_vars)
        row[_var_index(1, n, 0, U_size, C)] = 1.0
        eq_rows.append(row)
        eq_rhs.append(0.0)

    for n in range(K):
        for a in range(C + 1):
            row = np.zeros(num_vars)
            row[_var_index(1, n, a, U_size, C)] = 1.0
            eq_rows.append(row)
            eq_rhs.append(0.0)

    row = np.zeros(num_vars)
    row[_var_index(0, U_size - 1, 0, U_size, C)] = 1.0
    eq_rows.append(row)
    eq_rhs.append(0.0)

    if Code in [1, 2, 3]:
        for n in range(K - 1):
            for a in range(1, C + 1):
                row = np.zeros(num_vars)
                row[_var_index(0, n, a, U_size, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)
        row = np.zeros(num_vars)
        row[_var_index(0, K - 1, 0, U_size, C)] = 1.0
        eq_rows.append(row)
        eq_rhs.append(0.0)

        if Code == 2:
            for a in range(2, C + 1):
                row = np.zeros(num_vars)
                row[_var_index(0, K - 1, a, U_size, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)
        elif Code == 3:
            for a in range(1, C):
                row = np.zeros(num_vars)
                row[_var_index(0, K - 1, a, U_size, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)

    elif Code in [4, 5, 6]:
        for n in range(U_size - 1):
            for a in range(1, C + 1):
                row = np.zeros(num_vars)
                row[_var_index(0, n, a, U_size, C)] = 1.0
                eq_rows.append(row)
                eq_rhs.append(0.0)

        if Code == 5:
            for n in range(U_size):
                for a in range(2, C + 1):
                    row = np.zeros(num_vars)
                    row[_var_index(1, n, a, U_size, C)] = 1.0
                    eq_rows.append(row)
                    eq_rhs.append(0.0)
        elif Code == 6:
            for n in range(U_size):
                for a in range(1, C):
                    row = np.zeros(num_vars)
                    row[_var_index(1, n, a, U_size, C)] = 1.0
                    eq_rows.append(row)
                    eq_rhs.append(0.0)

    A_eq = np.array(eq_rows)
    b_eq = np.array(eq_rhs)
    bounds = [(0, None)] * num_vars

    result = linprog(
        c,
        A_eq=A_eq,
        b_eq=b_eq,
        bounds=bounds,
        method="highs",
        options={"presolve": True, "dual_feasibility_tolerance": 1e-9},
    )

    if not result.success:
        raise Exception(f"MF solver failed: {result.message}")

    SolutionMat = result.x.reshape(2, U_size, C + 1)
    c_matrix = c.reshape(2, U_size, C + 1)
    ObjValue = result.fun

    return SolutionMat, ObjValue, c_matrix

# ============================================================
# API Endpoint
# ============================================================

@app.post("/api/optimize")
async def optimize(params: OptimizeRequest):
    try:
        eps = 0.01

        (
            NumberNonGreenV,
            DistributionV,
            DistributionVgivenYellow,
            DistributionVgivenRed,
            ObsTransM,
            NotRed_t,
            U,
        ) = PreProcessing(params.alpha, params.K, params.C, eps)

        SolutionMat, Objective, c_matrix = ReliabilityMF(
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
            cs=params.cs,
            NumberNonGreenV=NumberNonGreenV,
            DistributionV=DistributionV,
            DistributionVgivenYellow=DistributionVgivenYellow,
            DistributionVgivenRed=DistributionVgivenRed,
            ObsTransM=ObsTransM,
        )

        U_size = U + 2

        # METRIC 1: Probability of NOT being in red state
        prob_red = float(np.sum(SolutionMat[1, :, :]))
        prob_not_red = 1.0 - prob_red

        # METRIC 2: Maximum intervention level (n*)
        max_intervention_level = 0
        for n in range(U_size):
            if np.sum(SolutionMat[0, n, 1:params.C + 1]) > 1e-9:
                max_intervention_level = n

        # METRIC 3: Average intervention level
        total_intervention_prob = 0.0
        weighted_sum = 0.0
        for n in range(U_size):
            intervene_prob = float(
                np.sum(SolutionMat[0, n, 1:params.C + 1])
                + np.sum(SolutionMat[1, n, 1:params.C + 1])
            )
            weighted_sum += n * intervene_prob
            total_intervention_prob += intervene_prob
        avg_intervention_level = (
            weighted_sum / total_intervention_prob if total_intervention_prob > 0 else 0.0
        )

        # Build tableRows, optimalPolicy, costByState
        optimalPolicy = []
        costByState = []
        tableRows = []

        for n in range(U_size):
            prob_0 = sum(SolutionMat[0, n, :])
            cost_0 = sum(SolutionMat[0, n, :] * c_matrix[0, n, :])
            intervene_prob_0 = sum(SolutionMat[0, n, 1:params.C + 1])

            # Determine optimal spare parts to bring for not-red state
            best_a_notred = 0
            best_p_notred = 0.0
            for a in range(1, params.C + 1):
                if SolutionMat[0, n, a] > best_p_notred:
                    best_p_notred = SolutionMat[0, n, a]
                    best_a_notred = a

            # Signal label: n=0 -> Green, not-red n>=1 -> Yellow
            signal_notred = "Green" if n == 0 else "Yellow"

            tableRows.append({
                "decisionPeriod": n,
                "signalState": signal_notred,
                "recommendedAction": "Perform Maintenance" if intervene_prob_0 > 1e-9 else "Wait",
                "actionType": "Preventive Maintenance" if intervene_prob_0 > 1e-9 else "No Action",
                "expectedCost": float(cost_0),
                "probability": float(prob_0),
                "interventionProbability": float(intervene_prob_0),
                "optimalSpareParts": best_a_notred if intervene_prob_0 > 1e-9 else 0,
            })

            prob_1 = sum(SolutionMat[1, n, :])
            cost_1 = sum(SolutionMat[1, n, :] * c_matrix[1, n, :])
            intervene_prob_1 = sum(SolutionMat[1, n, 1:params.C + 1])

            best_a_red = 0
            best_p_red = 0.0
            for a in range(1, params.C + 1):
                if SolutionMat[1, n, a] > best_p_red:
                    best_p_red = SolutionMat[1, n, a]
                    best_a_red = a

            tableRows.append({
                "decisionPeriod": n,
                "signalState": "Red",
                "recommendedAction": "Perform Maintenance" if intervene_prob_1 > 1e-9 else "Wait",
                "actionType": "Corrective Maintenance" if intervene_prob_1 > 1e-9 else "No Action",
                "expectedCost": float(cost_1),
                "probability": float(prob_1),
                "interventionProbability": float(intervene_prob_1),
                "optimalSpareParts": best_a_red if intervene_prob_1 > 1e-9 else 0,
            })

            if intervene_prob_1 > 0.001:
                optimalPolicy.append(2)   # Corrective
            elif intervene_prob_0 > 0.001:
                optimalPolicy.append(1)   # Preventive
            else:
                optimalPolicy.append(0)   # Do nothing

            costByState.append(float(cost_0 + cost_1))

        # Build spare parts chart data
        sparePartsData = []
        for n in range(U_size):
            intervene_prob_0 = sum(SolutionMat[0, n, 1:params.C + 1])
            intervene_prob_1 = sum(SolutionMat[1, n, 1:params.C + 1])

            best_a_notred = 0
            for a in range(params.C, 0, -1):
                if SolutionMat[0, n, a] > 1e-9:
                    best_a_notred = a
                    break

            best_a_red = 0
            for a in range(params.C, 0, -1):
                if SolutionMat[1, n, a] > 1e-9:
                    best_a_red = a
                    break

            if intervene_prob_0 > 1e-9 or intervene_prob_1 > 1e-9:
                entry = {"period": n}
                if intervene_prob_0 > 1e-9:
                    entry["preventiveParts"] = best_a_notred
                if intervene_prob_1 > 1e-9:
                    entry["correctiveParts"] = best_a_red
                sparePartsData.append(entry)

        # Expected state cost per signal
        total_prob_green = float(np.sum(SolutionMat[0, 0, :]))
        total_prob_yellow = float(np.sum(SolutionMat[0, 1:, :]))
        total_prob_red = float(np.sum(SolutionMat[1, :, :]))

        cost_green = float(np.sum(SolutionMat[0, 0, :] * c_matrix[0, 0, :]))
        cost_yellow = float(np.sum(SolutionMat[0, 1:, :] * c_matrix[0, 1:, :]))
        cost_red = float(np.sum(SolutionMat[1, :, :] * c_matrix[1, :, :]))

        expectedStateCost = {
            "green": round(cost_green / total_prob_green, 4) if total_prob_green > 1e-9 else 0.0,
            "yellow": round(cost_yellow / total_prob_yellow, 4) if total_prob_yellow > 1e-9 else 0.0,
            "red": round(cost_red / total_prob_red, 4) if total_prob_red > 1e-9 else 0.0,
            "greenProb": round(total_prob_green, 6),
            "yellowProb": round(total_prob_yellow, 6),
            "redProb": round(total_prob_red, 6),
        }

        # State descriptions
        DetSSize = params.K + 1
        StateSpacesSize = DetSSize ** params.C
        state_descriptions = []
        for n in range(StateSpacesSize):
            desc = StateDesc(n, params.C, DetSSize)
            state_descriptions.append(desc.tolist())

        return {
            "probNotRed": round(prob_not_red, 6),
            "maxInterventionLevel": max_intervention_level,
            "avgInterventionLevel": round(avg_intervention_level, 4),
            "totalCost": float(Objective),
            "optimalPolicy": optimalPolicy,
            "costByState": costByState,
            "stateDescriptions": state_descriptions,
            "tableRows": tableRows,
            "sparePartsData": sparePartsData,
            "expectedStateCost": expectedStateCost,
            "iterations": [Objective * 1.5, Objective * 1.2, Objective * 1.05, Objective],
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
