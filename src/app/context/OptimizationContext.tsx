import { createContext, useContext, useState, ReactNode } from 'react';
import { OptimizationResult } from '../utils/mdpSolver';
import { SystemParameters } from '../components/ParameterInput';

interface OptimizationContextType {
  result: OptimizationResult | null;
  params: SystemParameters | null;
  setOptimizationData: (result: OptimizationResult, params: SystemParameters) => void;
  clearOptimizationData: () => void;
}

const OptimizationContext = createContext<OptimizationContextType | undefined>(undefined);

export function OptimizationProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [params, setParams] = useState<SystemParameters | null>(null);

  const setOptimizationData = (newResult: OptimizationResult, newParams: SystemParameters) => {
    setResult(newResult);
    setParams(newParams);
  };

  const clearOptimizationData = () => {
    setResult(null);
    setParams(null);
  };

  return (
    <OptimizationContext.Provider value={{ result, params, setOptimizationData, clearOptimizationData }}>
      {children}
    </OptimizationContext.Provider>
  );
}

export function useOptimization() {
  const context = useContext(OptimizationContext);
  if (context === undefined) {
    throw new Error('useOptimization must be used within an OptimizationProvider');
  }
  return context;
}
