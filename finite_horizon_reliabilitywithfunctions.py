"""
Finite Horizon Reliability Preprocessing Module

This module contains the core preprocessing functions for the Maintenance Optimization
Tool. It builds the state space, transition matrices, and conditional distributions
for a multi-component deterioration system using a Partially Observable Markov
Decision Process (POMDP) model.

No commercial solver (e.g. Gurobi) is required — only NumPy.
"""

import numpy as np


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
        NumberNonGreenV:          For each joint state, how many components are NOT green
        DistributionV:            Unconditional probability distribution over states at each step
        DistributionVgivenYellow: Conditional distribution given system is in yellow (not-red)
        DistributionVgivenRed:    Conditional distribution given system is in red
        ObsTransM:                Observed transition probabilities [P(stay yellow), P(turn red)]
        NotRed_t:                 Cumulative probability of not reaching red by time t
        t:                        Time truncation point U
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

        # A state is "red" if ANY component has reached level K
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

        # Count non-green components
        NumNonGreen = 0
        for i in range(C):
            if StateV[i] != 0:
                NumNonGreen += 1
        NumberNonGreenV[Ind] = NumNonGreen

    # --- Step 2: Build transition probability matrix ---
    for FromInd in range(StateSpacesSize):
        FromStateV = StateDesc(FromInd, C, DetSSize)

        if FromInd in RedList:
            TransitionM[FromInd, FromInd] = 1  # Red states are absorbing
        else:
            for IncInd in range(2 ** C):
                IncV = StateDesc(IncInd, C, 2)
                ToStateV = FromStateV + IncV
                ToStateInd = StateIndex(ToStateV, C, DetSSize)
                TransitionM[FromInd, ToStateInd] = (1 - alpha) ** (sum(IncV)) * (alpha ** (C - sum(IncV)))

    # --- Step 3: Compute conditional distributions over time ---
    t = 0
    DistributionV[0, :] = TransitionM[0, :]
    CondDistV = 1 / (1 - DistributionV[0, 0]) * DistributionV[0, :]
    CondDistV[0] = 0
    DistributionV[0, :] = CondDistV

    CondDistV = np.multiply(CondDistV, NotRedMaskV)
    SumNotRed = np.sum(CondDistV)
    CondDistV = 1 / SumNotRed * CondDistV

    DistributionVgivenYellow[0, :] = CondDistV
    if SumNotRed != 1:
        DistributionVgivenRed[0, :] = np.multiply(CondDistV, RedMaskV) / (1 - SumNotRed)

    ObsTransM[0, :] = [SumNotRed, 1 - SumNotRed]

    NotRed_t = [SumNotRed]

    while NotRed_t[t] > Eps:
        t += 1

        DistributionV = np.append(DistributionV, [np.matmul(CondDistV, TransitionM)], axis=0)

        CondDistV = np.multiply(DistributionV[t, :], NotRedMaskV)
        SumNotRed = np.sum(CondDistV)

        NotRed_t = np.append(NotRed_t, NotRed_t[t - 1] * SumNotRed)

        ObsTransM = np.append(ObsTransM, [[SumNotRed, 1 - SumNotRed]], axis=0)
        CondDistV = 1 / SumNotRed * CondDistV

        DistributionVgivenYellow = np.append(DistributionVgivenYellow, [CondDistV], axis=0)
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
