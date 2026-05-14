import csv
from originalcode import PreProcessing, ReliabilityLP

alpha = 0.85
K = 2
C = 2
Eps = 0.1
cp = 100
cc = 400
ct = 30
cr = 50
cu = 60
co = 30

NumberNonGreenV, DistributionV, ObsTransM, U = PreProcessing(alpha, K, C, Eps)
SolutionMat, Objective = ReliabilityLP(0,K,C,U,alpha,cp,cc,cr,cu,co)
print(f"Objective={Objective}")
