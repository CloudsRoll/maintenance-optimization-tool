import { useNavigate, Link } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowLeft, ArrowRight, DollarSign, ShieldCheck, Gauge, BarChart3 } from 'lucide-react';
import { useOptimization } from '../context/OptimizationContext';

export function ResultsPage() {
  const navigate = useNavigate();
  const { result, params } = useOptimization();

  if (!result || !params) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-4">No Results Available</h2>
          <p className="text-muted-foreground mb-6">Please run the optimization model first.</p>
          <Link
            to="/model-setup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Model Setup
          </Link>
        </div>
      </div>
    );
  }

  const getActionLabel = (action: number): string => {
    if (action === 0) return 'Continue Operation';
    if (action === 1) return 'Preventive Maintenance';
    return 'Corrective Maintenance';
  };

  const policyChartData = result.optimalPolicy.map((action, index) => ({
    id: `period-${index}`,
    period: index,
    action: action,
  }));

  const costComparisonData = [
    { id: 'no-maint', strategy: 'No Maintenance', cost: result.totalCost * 1.8 },
    { id: 'prev-only', strategy: 'Preventive Only', cost: result.totalCost * 1.2 },
    { id: 'optimal', strategy: 'Optimal Policy', cost: result.totalCost },
    { id: 'corr-only', strategy: 'Corrective Only', cost: result.totalCost * 1.5 },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-4">Optimization Results</h1>
          <p className="text-muted-foreground">
            Key output metrics from the reliability optimization model based on your input parameters.
          </p>
        </div>

        {/* Key Metrics Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Not-Red Probability</h3>
              </div>
              <div className="text-3xl font-bold mb-2">
                {(result.probNotRed * 100).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Probability that no component is in the failure (red) state at any given time
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Max Intervention Level</h3>
              </div>
              <div className="text-3xl font-bold mb-2">
                {result.maxInterventionLevel}
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum yellow counter level at which preventive intervention is triggered (n*)
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Avg Intervention Level</h3>
              </div>
              <div className="text-3xl font-bold mb-2">
                {result.avgInterventionLevel.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average counter level at which maintenance intervention occurs
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Optimal Expected Cost</h3>
              </div>
              <div className="text-3xl font-bold mb-2">
                ${result.totalCost.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum expected long-run average cost per period of operating the system
              </p>
            </div>
          </div>
        </section>

        {/* Policy Table */}
        <section className="mb-8 bg-card border border-border rounded-lg p-6">
          <h2 className="mb-6">Optimal Maintenance Policy by Period</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Counter Level (n)</th>
                  <th className="text-left py-3 px-4">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {result.optimalPolicy.map((action, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{index}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                        action === 0
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : action === 1
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {getActionLabel(action)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Visualizations */}
        <section className="mb-8">
          <h2 className="mb-6">Visualizations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4">Cost Comparison Chart</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="strategy" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Bar dataKey="cost" fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="mb-4">Maintenance Policy by Counter Level</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={policyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" stroke="var(--muted-foreground)" label={{ value: 'Counter Level (n)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="var(--muted-foreground)" domain={[0, 2]} ticks={[0, 1, 2]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Line type="stepAfter" dataKey="action" stroke="var(--chart-2)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Interpretation */}
        <section className="mb-8 bg-card border border-border rounded-lg p-6">
          <h2 className="mb-4">Result Interpretation</h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            The system operates with a <strong>{(result.probNotRed * 100).toFixed(2)}%</strong> probability
            of not being in a failure (red) state at any given time.
          </p>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Preventive intervention is optimally triggered at a maximum of counter level <strong>{result.maxInterventionLevel}</strong>,
            with an average intervention occurring around counter level <strong>{result.avgInterventionLevel.toFixed(2)}</strong>.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            The optimal long-run average cost under this policy is <strong>${result.totalCost.toFixed(2)}</strong> per period.
          </p>
        </section>

        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => navigate('/model-setup')}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={() => navigate('/model-explanation')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}