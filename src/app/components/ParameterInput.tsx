import { useState } from 'react';

interface ParameterInputProps {
  onRunOptimization: (params: SystemParameters) => void;
}

export interface SystemParameters {
  numComponents: number;
  maxDeteriorationLevel: number;
  selfTransitionProbability: number;
  preventiveMaintenanceCost: number;
  correctiveMaintenanceCost: number;
  transferCostPerComponent: number;
  replacementCostPerNonGreen: number;
  underageCost: number;
  overageCost: number;
  sparePartCost: number;
}

export function ParameterInput({ onRunOptimization }: ParameterInputProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunOptimization(params);
  };

  const updateParam = (key: keyof SystemParameters, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-card rounded-lg border border-border">
      <h2 className="mb-6">System Parameters</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <h3 className="mb-4 text-muted-foreground">System Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="numComponents" className="block mb-2 text-foreground">
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
            </div>

            <div>
              <label htmlFor="maxDeteriorationLevel" className="block mb-2 text-foreground">
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
            </div>

            <div>
              <label htmlFor="selfTransitionProbability" className="block mb-2 text-foreground">
                Self Transition Probability (0-1)
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
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-4 text-muted-foreground">Cost Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="preventiveMaintenanceCost" className="block mb-2 text-foreground">
                Preventive Maintenance Cost ($)
              </label>
              <input
                id="preventiveMaintenanceCost"
                type="number"
                min="0"
                value={params.preventiveMaintenanceCost}
                onChange={(e) => updateParam('preventiveMaintenanceCost', parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="correctiveMaintenanceCost" className="block mb-2 text-foreground">
                Corrective Maintenance Cost ($)
              </label>
              <input
                id="correctiveMaintenanceCost"
                type="number"
                min="0"
                value={params.correctiveMaintenanceCost}
                onChange={(e) => updateParam('correctiveMaintenanceCost', parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="transferCostPerComponent" className="block mb-2 text-foreground">
                Transfer Cost per Component ($)
              </label>
              <input
                id="transferCostPerComponent"
                type="number"
                min="0"
                value={params.transferCostPerComponent}
                onChange={(e) => updateParam('transferCostPerComponent', parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="replacementCostPerNonGreen" className="block mb-2 text-foreground">
                Replacement Cost per Non-Green ($)
              </label>
              <input
                id="replacementCostPerNonGreen"
                type="number"
                min="0"
                value={params.replacementCostPerNonGreen}
                onChange={(e) => updateParam('replacementCostPerNonGreen', parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="underageCost" className="block mb-2 text-foreground">
                Underage Cost ($)
              </label>
              <input
                id="underageCost"
                type="number"
                min="0"
                value={params.underageCost}
                onChange={(e) => updateParam('underageCost', parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="overageCost" className="block mb-2 text-foreground">
                Overage Cost ($)
              </label>
              <input
                id="overageCost"
                type="number"
                min="0"
                value={params.overageCost}
                onChange={(e) => updateParam('overageCost', parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="sparePartCost" className="block mb-2 text-foreground">
                Spare Part Holding Cost ($)
              </label>
              <input
                id="sparePartCost"
                type="number"
                min="0"
                value={params.sparePartCost}
                onChange={(e) => updateParam('sparePartCost', parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="mt-8 w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          Run Optimization
        </button>
      </form>
    </div>
  );
}