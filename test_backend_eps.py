from backend.main import PreProcessing, ReliabilityMF

alpha = 0.31
K = 9
C = 4
cp = 1500
cc = 5000
ct = 99
cr = 65
cu = 63
co = 71

def run_backend(eps):
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
    return Objective

print(f"Eps=0.1: {run_backend(0.1)}")
print(f"Eps=0.01: {run_backend(0.01)}")
print(f"Eps=0.001: {run_backend(0.001)}")
