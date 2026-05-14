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
    numComponents: 5,
    maxDeteriorationLevel: 4,
    selfTransitionProbability: 0.7,
    preventiveMaintenanceCost: 100,
    correctiveMaintenanceCost: 500,
    transferCostPerComponent: 50,
    replacementCostPerNonGreen: 2000,
    underageCost: 150,
    overageCost: 200,
    sparePartCost: 10,
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
            Enter the system parameters below to run the maintenance optimization model.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Running optimization algorithm...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="mb-6">System Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="numComponents" className="block mb-2">
                    Number of Components
                  </label>
                  <input
                    id="numComponents"
                    type="number"
                    min="1"
                    max="20"
                    value={params.numComponents}
                    onChange={(e) => updateParam('numComponents', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Total number of components in the system being monitored.</p>
                </div>

                <div>
                  <label htmlFor="maxDeteriorationLevel" className="block mb-2">
                    Maximum Deterioration Level
                  </label>
                  <input
                    id="maxDeteriorationLevel"
                    type="number"
                    min="2"
                    max="10"
                    value={params.maxDeteriorationLevel}
                    onChange={(e) => updateParam('maxDeteriorationLevel', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Maximum degradation level a component can reach (defines state space).</p>
                </div>

                <div>
                  <label htmlFor="selfTransitionProbability" className="block mb-2">
                    Self Transition Probability
                  </label>
                  <input
                    id="selfTransitionProbability"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={params.selfTransitionProbability}
                    onChange={(e) => updateParam('selfTransitionProbability', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Probability that a component remains in the same state without deteriorating.</p>
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="mb-6">Cost Parameters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="preventiveMaintenanceCost" className="block mb-2">
                    Preventive Maintenance Cost
                  </label>
                  <input
                    id="preventiveMaintenanceCost"
                    type="number"
                    min="0"
                    value={params.preventiveMaintenanceCost}
                    onChange={(e) => updateParam('preventiveMaintenanceCost', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Cost of performing planned maintenance.</p>
                </div>

                <div>
                  <label htmlFor="correctiveMaintenanceCost" className="block mb-2">
                    Corrective Maintenance Cost
                  </label>
                  <input
                    id="correctiveMaintenanceCost"
                    type="number"
                    min="0"
                    value={params.correctiveMaintenanceCost}
                    onChange={(e) => updateParam('correctiveMaintenanceCost', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Cost of emergency repair after failure.</p>
                </div>

                <div>
                  <label htmlFor="transferCostPerComponent" className="block mb-2">
                    Transfer Cost Per Component
                  </label>
                  <input
                    id="transferCostPerComponent"
                    type="number"
                    min="0"
                    value={params.transferCostPerComponent}
                    onChange={(e) => updateParam('transferCostPerComponent', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Cost of transporting each component to maintenance.</p>
                </div>

                <div>
                  <label htmlFor="replacementCostPerNonGreen" className="block mb-2">
                    Replacement Cost Per Non-Green
                  </label>
                  <input
                    id="replacementCostPerNonGreen"
                    type="number"
                    min="0"
                    value={params.replacementCostPerNonGreen}
                    onChange={(e) => updateParam('replacementCostPerNonGreen', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Cost of replacing each deteriorated component.</p>
                </div>

                <div>
                  <label htmlFor="underageCost" className="block mb-2">
                    Underage Cost
                  </label>
                  <input
                    id="underageCost"
                    type="number"
                    min="0"
                    value={params.underageCost}
                    onChange={(e) => updateParam('underageCost', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Penalty for bringing fewer spare parts than needed.</p>
                </div>

                <div>
                  <label htmlFor="overageCost" className="block mb-2">
                    Overage Cost
                  </label>
                  <input
                    id="overageCost"
                    type="number"
                    min="0"
                    value={params.overageCost}
                    onChange={(e) => updateParam('overageCost', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Penalty for bringing more spare parts than needed.</p>
                </div>

                <div>
                  <label htmlFor="sparePartCost" className="block mb-2">
                    Spare Part Holding Cost
                  </label>
                  <input
                    id="sparePartCost"
                    type="number"
                    min="0"
                    value={params.sparePartCost}
                    onChange={(e) => updateParam('sparePartCost', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-gray-500 mt-2">Cost of holding each spare part in inventory per intervention.</p>
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
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
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