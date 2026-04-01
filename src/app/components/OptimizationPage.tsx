import { useState } from 'react';
import { Link } from 'react-router';
import { ParameterInput, SystemParameters } from './ParameterInput';
import { ResultsDashboard } from './ResultsDashboard';
import { solveMDP, OptimizationResult } from '../utils/mdpSolver';
import { Settings, ArrowLeft } from 'lucide-react';

export function OptimizationPage() {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunOptimization = async (params: SystemParameters) => {
    setIsLoading(true);

    try {
      const optimizationResult = await solveMDP(params);
      setResult(optimizationResult);
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Failed to run optimization. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Running optimization algorithm...</p>
          </div>
        ) : result ? (
          <ResultsDashboard result={result} onReset={handleReset} />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h2>Configure System Parameters</h2>
              </div>
            </div>
            <ParameterInput onRunOptimization={handleRunOptimization} />
          </div>
        )}
      </div>
    </div>
  );
}