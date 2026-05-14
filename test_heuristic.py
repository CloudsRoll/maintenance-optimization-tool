import numpy as np
from originalcode import PreProcessing, ReliabilityLP

cp = 1500
cc = 5000
ct = 99
cr = 65
cu = 63
co = 71
C = 4
K = 9
alpha = 0.31
Eps = 0.1

NumberNonGreenV, DistributionV, DistributionVgivenYellow, DistributionVgivenRed, ObsTransM, NotRed_t, U = PreProcessing(alpha, K, C, Eps)

DetSSize = K+1
StateSpacesSize = DetSSize**C

PeriodCosts = np.zeros((2, U+2, C+1))
PeriodCosts[0,:,1:C+1] = cp
PeriodCosts[1,:,:] = cc

for s in range(2):
    for n in range(0,U+2):     #   Check n
        for a in range(1, C+1):

            PeriodCosts[s,n,a] += ct*a

            if n == 0:
                # In the first period we are always in state 1
                PeriodCosts[s,n,a] += (cr*NumberNonGreenV[0]+cu*max(NumberNonGreenV[0]-a,0)+co*max(-NumberNonGreenV[0]+a,0))

            else:
                for Ind in range(StateSpacesSize):
                    if s == 0:
                        PeriodCosts[s,n,a] += (cr*NumberNonGreenV[Ind]+cu*max(NumberNonGreenV[Ind]-a,0)+co*max(-NumberNonGreenV[Ind]+a,0))*DistributionVgivenYellow[n-1,Ind]
                    else:
                        PeriodCosts[s,n,a] += (cr*NumberNonGreenV[Ind]+cu*max(NumberNonGreenV[Ind]-a,0)+co*max(-NumberNonGreenV[Ind]+a,0))*DistributionVgivenRed[n-1,Ind]


OptPartDec = np.zeros((2, U+2),dtype=int)
CostsUnderOptPartDec = np.zeros((2, U+2),dtype=np.float64)

OptPartDec[0,:] = np.argmin(PeriodCosts[0,:,1:],axis=1)+1
CostsUnderOptPartDec[0,:] = np.min(PeriodCosts[0,:,1:],axis=1)

OptPartDec[1,:] = np.argmin(PeriodCosts[1,:,1:],axis=1)+1
CostsUnderOptPartDec[1,:] = np.min(PeriodCosts[1,:,1:],axis=1)

IntPeriodDist = np.zeros(U+2)
IntPeriodDist[0] = 1 - NotRed_t[0]

for t in range(1,U+1):
    IntPeriodDist[t] = NotRed_t[t-1] - NotRed_t[t]

ExpectedPeriodsToState1 = 1/(1-alpha**C)

AveCostGivenYellowInt = np.zeros(U+1)
P0_YellowInt = np.zeros(U+1)

for YellowInt in range(U+1):
    ExpPeriodCost = 0
    Ptot = 0
    ExpectedPeriod = 0

    for Period in range(YellowInt+1):
        ExpectedPeriod += (ExpectedPeriodsToState1+Period+1)*IntPeriodDist[Period]
        ExpPeriodCost += CostsUnderOptPartDec[1,Period+1]*IntPeriodDist[Period]
        Ptot += IntPeriodDist[Period]

    ExpPeriodCost += CostsUnderOptPartDec[0,YellowInt+1]*NotRed_t[YellowInt]
    Ptot += NotRed_t[YellowInt]
    ExpectedPeriod += (ExpectedPeriodsToState1+YellowInt+1)*NotRed_t[YellowInt]
    P0_YellowInt[YellowInt] = ExpectedPeriodsToState1/ExpectedPeriod
    AveCostGivenYellowInt[YellowInt] = ExpPeriodCost/ExpectedPeriod

print("Heuristic Cost =", np.min(AveCostGivenYellowInt))

SolutionMat, Objective = ReliabilityLP(0,K,C,U,alpha,cp,cc,cr,cu,co)
print("LP Objective =", Objective)
