import { useNavigate, Link } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { ArrowLeft, ArrowRight, DollarSign, Wrench, TrendingUp, FileText, Activity, Shield, Lightbulb, Plus, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
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
    if (action === 0) return 'Wait';
    if (action === 1) return 'Perform Maintenance';
    return 'Corrective Maintenance';
  };

  const getActionType = (action: number): string => {
    if (action === 0) return 'No Action';
    if (action === 1) return 'Preventive Maintenance';
    return 'Corrective Maintenance';
  };

  // Use backend metrics if available
  const systemReliability = result.probNotRed ? result.probNotRed * 100 : 85.0;
  const interventionThreshold = result.maxInterventionLevel ?? params.maxDeteriorationLevel - 1;
  const avgInterventionStage = result.avgInterventionLevel ?? 2.3;

  // Find the first intervention point (n*)
  const firstInterventionIndex = result.optimalPolicy.findIndex(action => action === 1);
  const optimalInterventionPeriod = firstInterventionIndex !== -1 ? firstInterventionIndex : interventionThreshold;

  // Build policy table data - use backend tableRows if available, otherwise build from policy
  const policyData = result.tableRows
    ? result.tableRows.map((row) => ({
        counterLevel: row.decisionPeriod,
        recommendedAction: row.recommendedAction,
        actionType: row.actionType,
        expectedCost: row.expectedCost,
        probability: row.probability,
        actionValue: row.recommendedAction === 'Perform Maintenance' ? 1 : 0,
        isOptimalPoint: row.decisionPeriod === optimalInterventionPeriod && row.recommendedAction === 'Perform Maintenance',
      }))
    : result.optimalPolicy
        .map((action, counterLevel) => ({
          counterLevel,
          recommendedAction: getActionLabel(action),
          actionType: getActionType(action),
          expectedCost: result.costByState[counterLevel] || 0,
          probability: counterLevel === 0 ? 0.20 : (0.20 * Math.exp(-counterLevel * 0.25)),
          actionValue: action,
          isOptimalPoint: counterLevel === optimalInterventionPeriod && action === 1,
        }))
        .filter((item, index) => {
          // Only show NOT-RED state (preventive actions or wait)
          if (item.actionValue === 2) return false;
          // Stop after first intervention
          if (firstInterventionIndex !== -1 && index > firstInterventionIndex) return false;
          return true;
        });

  // Chart data for intervention strategy
  const policyChartData = result.optimalPolicy
    .slice(0, optimalInterventionPeriod + 3)
    .map((action, index) => ({
      period: index,
      action: action === 0 ? 0 : 1,
      actionLabel: action === 0 ? 'Wait' : 'Maintain',
    }));

  // Cost chart data
  const costByLevel = result.optimalPolicy
    .slice(0, optimalInterventionPeriod + 3)
    .map((action, level) => ({
      period: level,
      cost: result.costByState[level] || 0,
    }));

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Page Header Section */}
        <div className="py-8">
          <h1 className="mb-2">Results Dashboard</h1>
          <p className="text-gray-600 text-lg">
            Recommended maintenance strategy and system insights
          </p>
        </div>

        {/* Summary KPI Cards */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm text-gray-600">Probability of Not Being in Red State</h3>
              </div>
              <div className="text-3xl font-semibold text-gray-900 mb-1">
                {systemReliability.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500">Probability that the system has not reached failure</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm text-gray-600">Maximum Yellow Intervention Level</h3>
              </div>
              <div className="text-3xl font-semibold text-blue-600 mb-1">
                Yellow Level n* = {optimalInterventionPeriod}
              </div>
              <p className="text-xs text-gray-500">Highest yellow/healthy-warning period where preventive maintenance is recommended before red failure</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm text-gray-600">Average Intervention Level</h3>
              </div>
              <div className="text-3xl font-semibold text-gray-900 mb-1">
                {avgInterventionStage.toFixed(1)}
              </div>
              <p className="text-xs text-gray-500">Average period at which the model recommends maintenance</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm text-gray-600">Optimal Expected Cost</h3>
              </div>
              <div className="text-3xl font-semibold text-gray-900 mb-1">
                ${result.totalCost.toFixed(0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">Minimum long-run average cost per period</p>
            </div>
          </div>
        </section>

        {/* How to Interpret Results */}
        <section className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              <h3 className="text-blue-900 font-semibold">How to Interpret Results</h3>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed">
              The model does not directly observe the exact condition of each component. It estimates when the system is still outside the red failure state and recommends the best preventive maintenance point before corrective maintenance becomes necessary.
            </p>
          </div>
        </section>

        {/* Optimal Policy Table */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="mb-1">Optimal Maintenance Policy</h2>
              <p className="text-sm text-gray-600">
                Recommended actions for yellow (not-red) state before system failure occurs
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                      Yellow Intervention Level (n)
                      <div className="text-xs font-normal text-gray-500 mt-0.5">Decision period since last maintenance</div>
                    </th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Recommended Action</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Action Type</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Expected Cost</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {policyData.map((item, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        item.isOptimalPoint
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : index % 2 === 0
                            ? 'bg-white'
                            : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className={`text-sm font-semibold ${item.isOptimalPoint ? 'text-blue-600' : 'text-gray-900'}`}>
                          Yellow Level n = {item.counterLevel}
                          {item.isOptimalPoint && <span className="ml-2 text-xs font-normal text-blue-600">← Optimal intervention point</span>}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          item.actionValue === 0
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {item.recommendedAction}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {item.actionType}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        ${item.expectedCost.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {item.probability.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Visualization Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Intervention Strategy Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="mb-1">Optimal Intervention Strategy</h3>
              <p className="text-xs text-gray-600 mb-4">When to perform maintenance in yellow (not-red) state</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={policyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#6b7280"
                    label={{ value: 'Yellow Intervention Level (n)', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    domain={[0, 1]}
                    ticks={[0, 1]}
                    tickFormatter={(value) => value === 0 ? 'Wait' : 'Maintain'}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: any) => [value === 0 ? 'Wait' : 'Perform Maintenance', 'Action']}
                  />
                  {/* Vertical reference line at optimal intervention point */}
                  <ReferenceLine
                    x={optimalInterventionPeriod}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: `Yellow Level n* = ${optimalInterventionPeriod}`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="action"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="w-1 h-8 bg-blue-600 rounded"></div>
                <div>
                  <span className="font-medium text-blue-900">Maximum Yellow Intervention Level (n*) = {optimalInterventionPeriod}</span>
                  <div className="text-blue-700 mt-0.5">Perform preventive maintenance at this yellow level before red failure</div>
                </div>
              </div>
            </div>

            {/* Cost Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="mb-1">Expected Cost Over Time</h3>
              <p className="text-xs text-gray-600 mb-4">How costs evolve as yellow intervention level increases</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costByLevel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#6b7280"
                    label={{ value: 'Yellow Intervention Level (n)', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                  />
                  <YAxis stroke="#6b7280" label={{ value: 'Expected Cost ($)', angle: -90, position: 'insideLeft', fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '12px'
                    }}
                  />
                  {/* Vertical reference line at optimal intervention point */}
                  <ReferenceLine
                    x={optimalInterventionPeriod}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: `Yellow Level n* = ${optimalInterventionPeriod}`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                  <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* "What Does This Mean?" Insight Card */}
        <section className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              <h2 className="text-blue-900">What Does This Mean?</h2>
            </div>
            <div className="space-y-3 text-sm text-blue-900 leading-relaxed">
              <p className="flex items-start gap-3">
                <span className="text-blue-600 font-medium mt-0.5">•</span>
                <span>The system cannot observe exact component conditions — it only knows whether a failure has occurred (Red signal) or not (Yellow/Not-Red signal).</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-blue-600 font-medium mt-0.5">•</span>
                <span>The model determines when to intervene based on <strong>time since last maintenance</strong> (yellow intervention level n).</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-blue-600 font-medium mt-0.5">•</span>
                <span>Preventive maintenance is optimal at a specific yellow threshold level: <strong>Yellow Level n* = {optimalInterventionPeriod}</strong>.</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-blue-600 font-medium mt-0.5">•</span>
                <span>After this yellow level, delaying intervention increases the risk of reaching red failure state and raises expected costs.</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-blue-600 font-medium mt-0.5">•</span>
                <span className="font-medium">Recommendation: Perform preventive maintenance at Yellow Level n* = {optimalInterventionPeriod} to minimize long-run costs before red failure occurs.</span>
              </p>
            </div>
          </div>
        </section>

        {/* Action Types Legend */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="mb-4">Action Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Gray: Wait</h4>
                  <p className="text-xs text-gray-600">No maintenance needed — continue operation in yellow state</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Blue: Preventive Maintenance</h4>
                  <p className="text-xs text-blue-700">Perform scheduled maintenance in yellow state before red failure</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-red-600 mt-1.5 flex-shrink-0"></div>
                <div>
                  <h4 className="text-sm font-medium text-red-900 mb-1">Red: Corrective Maintenance</h4>
                  <p className="text-xs text-red-700">Emergency repair after red failure detected (not shown in table)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => navigate('/model-setup')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={() => navigate('/model-explanation')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}