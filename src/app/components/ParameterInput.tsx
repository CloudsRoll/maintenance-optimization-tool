import { useState } from 'react';

interface ParameterInputProps {
  onRunOptimization: (params: SystemParameters) => void;
}

export interface SystemParameters {
  alpha: number;
  K: number;
  C: number;
  cp: number;
  cc: number;
  ct: number;
  cr: number;
  cu: number;
  co: number;
}

export function ParameterInput({ onRunOptimization }: ParameterInputProps) {
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
          <h3 className="mb-4 text-muted-foreground">General Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label htmlFor="C" className="block mb-2 text-foreground">
                Number of Components (C)
              </label>
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
              <label htmlFor="K" className="block mb-2 text-foreground">
                Max Deterioration (K)
              </label>
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
              <label htmlFor="alpha" className="block mb-2 text-foreground">
                Deterioration Prob (alpha)
              </label>
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
        </div>

        <div className="mb-6">
          <h3 className="mb-4 text-muted-foreground">Cost Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="cp" className="block mb-2 text-foreground">
                Preventive Cost (cp) $
              </label>
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
              <label htmlFor="cc" className="block mb-2 text-foreground">
                Corrective Cost (cc) $
              </label>
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
              <label htmlFor="ct" className="block mb-2 text-foreground">
                Transfer Cost (ct) $
              </label>
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
              <label htmlFor="cr" className="block mb-2 text-foreground">
                Replacement Cost (cr) $
              </label>
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
              <label htmlFor="cu" className="block mb-2 text-foreground">
                Underage Cost (cu) $
              </label>
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
              <label htmlFor="co" className="block mb-2 text-foreground">
                Overage Cost (co) $
              </label>
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
        </div>

        <button
          type="submit"
          className="mt-8 w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium"
        >
          Run Optimization
        </button>
      </form>
    </div>
  );
}
