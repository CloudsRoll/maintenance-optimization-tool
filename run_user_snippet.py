import numpy as np

def StateIndex(StateDescV, Dim, SetSize):
    Index = 0
    for i in range(Dim):
        Index += StateDescV[i]*((SetSize)**i)
    return int(Index)

def StateDesc(Ind, Dim, SetSize):
    StateDescV = np.zeros(Dim,dtype=int)
    for i in range(Dim):
        StateDescV[i] = np.remainder(Ind,SetSize)
        Ind = np.floor_divide(Ind,SetSize)
    return StateDescV

def PreProcessing(alpha, K, C, Eps):
    DetSSize = K+1
    StateSpacesSize = DetSSize**C                               #Size of the state space for joint distribution
    TransitionM = np.zeros([StateSpacesSize,StateSpacesSize])
    DistributionV = np.zeros([1,StateSpacesSize])
    DistributionVgivenYellow = np.zeros([1,StateSpacesSize])
    DistributionVgivenRed = np.zeros([1,StateSpacesSize])

    CondDistV = np.zeros(StateSpacesSize)
    ObsTransM= np.zeros([1,2])                                  #Transition Probabilities from Yellow States to Yellow or Red States at counter t(Row Number)

    RedMaskV = np.zeros(StateSpacesSize,dtype=int)
    NotRedMaskV = np.zeros(StateSpacesSize,dtype=int)
    NumberNonGreenV = np.zeros(StateSpacesSize,dtype=int)
    StateDescVector = np.zeros(C)

    RedList = []
    for Ind in range(StateSpacesSize):
        StateV = StateDesc(Ind,C,DetSSize)
        RedState = 0
        for i in range(C):
            if StateV[i]==K:
                RedState = 1
                break

        if RedState==0:
            NotRedMaskV[Ind] = 1
        else:
            RedMaskV[Ind] = 1
            RedList.append(Ind)

        NumNonGreen = 0
        for i in range(C):
            if StateV[i] !=0:
                NumNonGreen += 1
        NumberNonGreenV[Ind] = NumNonGreen

    for FromInd in range(StateSpacesSize):
        FromStateV = StateDesc(FromInd,C,DetSSize)

        if FromInd in RedList:
            TransitionM[FromInd,FromInd] =1
        else:
            for IncInd in range(2**C):
                IncV = StateDesc(IncInd,C,2)
                ToStateV = FromStateV+IncV
                ToStateInd = StateIndex(ToStateV,C,DetSSize)
                TransitionM[FromInd,ToStateInd]= (1-alpha)**(sum(IncV))*(alpha**(C-sum(IncV)))

    t=0         # First Period
    DistributionV[0,:] = TransitionM[0,:]
    CondDistV = 1/(1-DistributionV[0,0])*DistributionV[0,:]
    CondDistV[0] = 0
    DistributionV[0,:] = CondDistV

    CondDistV = np.multiply(CondDistV,NotRedMaskV)
    SumNotRed = np.sum(CondDistV)
    CondDistV = 1/SumNotRed*CondDistV

    DistributionVgivenYellow[0,:] = CondDistV
    if SumNotRed != 1:
        DistributionVgivenRed[0,:] = np.multiply(CondDistV,RedMaskV)/(1-SumNotRed)

    ObsTransM[0,:] = [SumNotRed,1-SumNotRed]

    NotRed_t = [SumNotRed]

    while NotRed_t[t] > Eps:
        t += 1

        DistributionV = np.append(DistributionV, [np.matmul(CondDistV,TransitionM)], axis=0)

        CondDistV = np.multiply(DistributionV[t,:],NotRedMaskV)
        SumNotRed = np.sum(CondDistV)

        NotRed_t = np.append(NotRed_t,NotRed_t[t-1]*SumNotRed)

        ObsTransM = np.append(ObsTransM, [[SumNotRed,1-SumNotRed]], axis=0)
        CondDistV = 1/SumNotRed*CondDistV

        DistributionVgivenYellow = np.append(DistributionVgivenYellow ,[CondDistV], axis=0)
        if SumNotRed != 1:
            DistributionVgivenRed = np.append(DistributionVgivenRed,[np.multiply(DistributionV[t,:],RedMaskV)/(1-SumNotRed)], axis=0)
        else:
            DistributionVgivenRed = np.append(DistributionVgivenRed,[np.zeros(StateSpacesSize, dtype = np.float64)], axis=0)

    return NumberNonGreenV, DistributionV, DistributionVgivenYellow, DistributionVgivenRed, ObsTransM, NotRed_t, t

cp = 1500               # Cost of Preventive Maintenance (Intervention cost at Yellow Signal)
cc = 5000
ct =99                  # Cost of transfering one component to maintenance site
cr = 65                 # Cost of replacing a non-Green component
cu = 63
co = 71                # Cost of returning an unused component at the end of intervention (return, overage)

C = 4
K = 9
alpha = .31

NumberNonGreenV, DistributionV, DistributionVgivenYellow, DistributionVgivenRed, ObsTransM, NotRed_t, U = PreProcessing(alpha, K, C, .1)

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

print(np.min(AveCostGivenYellowInt))
