from backend.main import PreProcessing, ReliabilityMF

eps = 0.1
alpha = 0.85
K = 2
C = 2
cp = 100
cc = 400
ct = 30
cr = 50
cu = 60
co = 30

(
    NumberNonGreenV,
    DistributionV,
    DistributionVgivenYellow,
    DistributionVgivenRed,
    ObsTransM,
    NotRed_t,
    U,
) = PreProcessing(alpha, K, C, eps)

SolutionMat, Objective, c_matrix = ReliabilityMF(
    Code=0,
    K=K,
    C=C,
    U=U,
    alpha=alpha,
    cp=cp,
    cc=cc,
    ct=ct,
    cr=cr,
    cu=cu,
    co=co,
    NumberNonGreenV=NumberNonGreenV,
    DistributionV=DistributionV,
    DistributionVgivenYellow=DistributionVgivenYellow,
    DistributionVgivenRed=DistributionVgivenRed,
    ObsTransM=ObsTransM,
)

print(f"Objective = {Objective}")
