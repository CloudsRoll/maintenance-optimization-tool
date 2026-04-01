import { useState } from 'react';
import { useNavigate } from 'react-router';
import { SystemParameters } from './ParameterInput';
import { solveMDP } from '../utils/mdpSolver';
import { useOptimization } from '../context/OptimizationContext';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export function ModelSetupPage() {
  const navigate = useNavigate();
  const { setOptimizationData } = useOptimization();
  const [params, setParams] = useState<SystemParameters>({
    alpha: 0.85,
    K: 3,
    C: 2,
    cp: 100,
    cc: 400,
    ct: 0,
    cr: 50,
    cu: 100,
    co: 5,
  });

  const [isLoading, setIsLoading] = useState(false);

  const updateParam = (key: keyof SystemParameters, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await solveMDP(params);
      setOptimizationData(result, params);
      navigate('/results');
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Failed to run optimization. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-4">Model Setup</h1>
          <p className="text-muted-foreground">
            Enter the system parameters below to run the reliability optimization model.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Running LP Optimization Algorithm...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="mb-6">System Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="C" className="block mb-1 text-foreground font-medium">
                    Number of Components (C)
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Total number of components in the system
                  </p>
                  <input
                    id="C"
                    type="number"
                    min="1"
                    max="20"
                    value={params.C}
                    onChange={(e) => updateParam('C', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="K" className="block mb-1 text-foreground font-medium">
                    Maximum Deterioration Level (K)
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Number of degradation levels before failure (red state)
                  </p>
                  <input
                    id="K"
                    type="number"
                    min="1"
                    max="10"
                    value={params.K}
                    onChange={(e) => updateParam('K', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="alpha" className="block mb-1 text-foreground font-medium">
                    Deterioration Probability (α)
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Probability that a component stays at its current deterioration level each period
                  </p>
                  <input
                    id="alpha"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={params.alpha}
                    onChange={(e) => updateParam('alpha', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="mb-6">Cost Parameters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="cp" className="block mb-1 text-foreground font-medium">
                    Preventive Maintenance Cost (cp) $
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cost incurred when performing planned maintenance
                  </p>
                  <input
                    id="cp"
                    type="number"
                    min="0"
                    value={params.cp}
                    onChange={(e) => updateParam('cp', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="cc" className="block mb-1 text-foreground font-medium">
                    Corrective Maintenance Cost (cc) $
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cost incurred when performing emergency repair after failure
                  </p>
                  <input
                    id="cc"
                    type="number"
                    min="0"
                    value={params.cc}
                    onChange={(e) => updateParam('cc', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="ct" className="block mb-1 text-foreground font-medium">
                    Transfer Cost Per Component (ct) $
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cost of transporting each component to the maintenance site
                  </p>
                  <input
                    id="ct"
                    type="number"
                    min="0"
                    value={params.ct}
                    onChange={(e) => updateParam('ct', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="cr" className="block mb-1 text-foreground font-medium">
                    Replacement Cost Per Non-Green (cr) $
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cost of replacing each non-green (deteriorated) component
                  </p>
                  <input
                    id="cr"
                    type="number"
                    min="0"
                    value={params.cr}
                    onChange={(e) => updateParam('cr', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="cu" className="block mb-1 text-foreground font-medium">
                    Underage Cost (cu) $
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Penalty for bringing fewer spare parts than needed
                  </p>
                  <input
                    id="cu"
                    type="number"
                    min="0"
                    value={params.cu}
                    onChange={(e) => updateParam('cu', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="co" className="block mb-1 text-foreground font-medium">
                    Overage Cost (co) $
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Penalty for bringing more spare parts than needed
                  </p>
                  <input
                    id="co"
                    type="number"
                    min="0"
                    value={params.co}
                    onChange={(e) => updateParam('co', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Run Optimization
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}