import { Link } from 'react-router';
import { OptimizationResult } from '../utils/mdpSolver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Home } from 'lucide-react';

interface ResultsDashboardProps {
  result: OptimizationResult;
  onReset: () => void;
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  
  // Create beautiful display strings out of the state matrices
  const getStateLabel = (index: number) => {
    if (result.stateDescriptions && result.stateDescriptions[index]) {
      const desc = result.stateDescriptions[index];
      // Check if it's the specific failure state shape (e.g. [1, 1, 1] means all failed)
      return `C:${desc.join(', ')}`;
    }
    return `S${index}`;
  };

  const getActionLabel = (actionVal: number) => {
    if (actionVal === 0) return 'Do Nothing';
    if (actionVal === 1) return 'Preventive';
    if (actionVal === 2) return 'Corrective';
    if (actionVal === 3) return 'Replacement';
    return `Action ${actionVal}`;
  };

  const getActionColor = (actionVal: number) => {
    if (actionVal === 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (actionVal === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (actionVal === 2) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  }

  // Safely limit chart mapping to only explicitly defined states (e.g. 16 combinations) rather than the padded solver arrays (40)
  const numActiveStates = result.stateDescriptions ? result.stateDescriptions.length : result.optimalPolicy.length;

  const costData = result.costByState.slice(0, numActiveStates).map((cost, index) => ({
    id: `cost-${index}`,
    state: getStateLabel(index),
    cost: parseFloat(cost.toFixed(2)),
  }));

  const policyData = result.optimalPolicy.slice(0, numActiveStates).map((action, index) => ({
    id: `policy-${index}`,
    state: getStateLabel(index),
    action: getActionLabel(action),
    actionValue: action,
  }));

  const convergenceData = result.iterations.map((iter, index) => ({
    id: `iter-${index}`,
    iteration: index + 1,
    maxChange: iter,
  }));

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2>Optimization Results</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            New Optimization
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-muted-foreground mb-2">Total Expected Cost</div>
          <div className="text-3xl">${result.totalCost.toFixed(2)}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-muted-foreground mb-2">Iterations to Converge</div>
          <div className="text-3xl">{result.iterations.length}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-muted-foreground mb-2">States Analyzed</div>
          <div className="text-3xl">{result.optimalPolicy.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="mb-4">Optimal Policy by Component State</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4">State Configurations</th>
                  <th className="text-left py-2 px-4">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {policyData.map((item, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-4 font-mono text-sm">{item.state}</td>
                    <td className="py-2 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(item.actionValue)}`}>
                        {item.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="mb-4">Expected Cost by Component State</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="state" 
                stroke="var(--muted-foreground)" 
                tick={{fontSize: 10}} 
                angle={-45} 
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem'
                }}
              />
              <Bar dataKey="cost" fill="var(--chart-1)" key="cost-bar" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Convergence Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={convergenceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="iteration" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="maxChange"
              stroke="var(--chart-2)"
              name="Objective Value Record"
              strokeWidth={2}
              key="convergence-line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}