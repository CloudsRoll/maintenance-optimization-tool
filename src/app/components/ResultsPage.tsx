import { useNavigate, Link } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine, ScatterChart, Scatter, Cell
} from 'recharts';
import {
  ArrowLeft, ArrowRight, DollarSign, Wrench, TrendingUp,
  Activity, Shield, Lightbulb, Package
} from 'lucide-react';
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

  // Use backend metrics
  const systemReliability = result.probNotRed !== undefined ? result.probNotRed * 100 : 85.0;
  const optimalInterventionPeriod = result.maxInterventionLevel ?? params.maxDeteriorationLevel - 1;
  const avgInterventionStage = result.avgInterventionLevel ?? 2.3;

  // Filter policy data for table
  const policyData = result.tableRows
    ? result.tableRows
        .filter(row => row.probability > 1e-6 || row.decisionPeriod <= optimalInterventionPeriod + 1)
        .map((row) => ({
          counterLevel: row.decisionPeriod,
          signalState: row.signalState, // "Green" | "Yellow" | "Red"
          recommendedAction: row.recommendedAction,
          actionType: row.actionType,
          expectedCost: row.expectedCost,
          probability: row.probability,
          optimalSpareParts: row.optimalSpareParts ?? 0,
          actionValue: row.recommendedAction === 'Perform Maintenance'
            ? (row.signalState === 'Red' ? 2 : 1)
            : 0,
          isOptimalPoint:
            row.decisionPeriod === optimalInterventionPeriod &&
            row.recommendedAction === 'Perform Maintenance' &&
            row.signalState !== 'Red',
        }))
    : result.optimalPolicy.map((action, counterLevel) => ({
        counterLevel,
        signalState: counterLevel === 0 ? 'Green' : 'Yellow',
        recommendedAction: action === 0 ? 'Wait' : 'Perform Maintenance',
        actionType: action === 0 ? 'No Action' : 'Preventive Maintenance',
        expectedCost: result.costByState[counterLevel] || 0,
        probability: counterLevel === 0 ? 0.20 : 0.20 * Math.exp(-counterLevel * 0.25),
        optimalSpareParts: 0,
        actionValue: action,
        isOptimalPoint: counterLevel === optimalInterventionPeriod && action === 1,
      }));

  // State probability bar chart data — stacked Green / Yellow / Red
  const maxPeriod = optimalInterventionPeriod + 3;
  const stateProbChartData = Array.from({ length: maxPeriod }, (_, period) => {
    if (result.tableRows) {
      const greenRow = result.tableRows.find(r => r.decisionPeriod === period && r.signalState === 'Green');
      const yellowRow = result.tableRows.find(r => r.decisionPeriod === period && r.signalState === 'Yellow');
      const notRedRow = result.tableRows.find(r => r.decisionPeriod === period && (r.signalState === 'Yellow' || r.signalState === 'Green'));
      const redRow = result.tableRows.find(r => r.decisionPeriod === period && r.signalState === 'Red');
      return {
        period,
        probGreen: greenRow?.probability ?? 0,
        probYellow: yellowRow?.probability ?? 0,
        probRed: redRow?.probability ?? 0,
      };
    }
    return {
      period,
      probGreen: period === 0 ? 0.20 : 0,
      probYellow: period > 0 ? 0.20 * Math.exp(-period * 0.25) : 0,
      probRed: period > 0 ? 0.05 * Math.exp(period * 0.1) * 0.1 : 0,
    };
  });

  // Expected cost by state chart data
  const chartsData = Array.from({ length: maxPeriod }, (_, period) => {
    if (result.tableRows) {
      const notRedRow = result.tableRows.find(r => r.decisionPeriod === period && r.signalState !== 'Red');
      const redRow = result.tableRows.find(r => r.decisionPeriod === period && r.signalState === 'Red');
      return {
        period,
        costNotRed: notRedRow ? notRedRow.expectedCost : 0,
        costRed: redRow ? redRow.expectedCost : 0,
      };
    }
    return {
      period,
      costNotRed: result.costByState[period] || 0,
      costRed: 0,
    };
  });

  // Spare parts scatter chart data
  const sparePartsData = result.sparePartsData ?? [];
  const preventivePoints = sparePartsData
    .filter(d => d.preventiveParts !== undefined)
    .map(d => ({ period: d.period, parts: d.preventiveParts }));
  const correctivePoints = sparePartsData
    .filter(d => d.correctiveParts !== undefined)
    .map(d => ({ period: d.period, parts: d.correctiveParts }));

  // Expected state cost
  const esc = result.expectedStateCost;

  // Signal state badge styling
  const getSignalBadgeClass = (state: string) => {
    if (state === 'Green') return 'bg-green-100 text-green-800 border border-green-200';
    if (state === 'Yellow') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-red-100 text-red-800 border border-red-200';
  };

  const getSignalDot = (state: string) => {
    if (state === 'Green') return '🟢';
    if (state === 'Yellow') return '🟡';
    return '🔴';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Page Header */}
        <div className="py-8">
          <h1 className="mb-2">Results Dashboard</h1>
          <p className="text-gray-600 text-lg">Recommended maintenance strategy and system insights</p>
        </div>

        {/* KPI Cards */}
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

            <div className="bg-white border border-blue-300 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm text-gray-600">Preventive Maintenance Point</h3>
              </div>
              <div className="text-3xl font-semibold text-blue-600 mb-1">
                n* = {optimalInterventionPeriod}
              </div>
              <p className="text-xs text-gray-500">Optimal period to perform preventive maintenance before failure</p>
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
                ${result.totalCost.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500">Minimum long-run average cost per period</p>
            </div>
          </div>
        </section>

        {/* How to Interpret */}
        <section className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              <h3 className="text-blue-900 font-semibold">How to Interpret Results</h3>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed mb-4">
              The model tracks 3 signal states per period based on time since last maintenance (n):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-lg">🟢</span>
                <div>
                  <div className="font-medium text-green-900 text-sm">Green (n = 0)</div>
                  <div className="text-xs text-green-700 mt-0.5">Freshly maintained, embedded at cycle start</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-lg">🟡</span>
                <div>
                  <div className="font-medium text-yellow-900 text-sm">Yellow (n ≥ 1, Not-Red)</div>
                  <div className="text-xs text-yellow-700 mt-0.5">Running, no failure detected — may intervene</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-lg">🔴</span>
                <div>
                  <div className="font-medium text-red-900 text-sm">Red (Failure)</div>
                  <div className="text-xs text-red-700 mt-0.5">Failure detected — corrective maintenance required</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* State Probability Bar Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-2">
              <h3 className="mb-1">State Probabilities Over Time</h3>
              <p className="text-xs text-gray-600 mb-4">
                Discrete probability distribution across Green / Yellow / Red states at each decision period (n)
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stateProbChartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#6b7280"
                    label={{ value: 'Decision Period (n)', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    label={{ value: 'Probability', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine
                    x={optimalInterventionPeriod}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: `PM Point n* = ${optimalInterventionPeriod}`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  />
                  <Bar dataKey="probGreen" name="Green (n=0)" stackId="a" fill="#22c55e" />
                  <Bar dataKey="probYellow" name="Yellow (Not-Red)" stackId="a" fill="#eab308" />
                  <Bar dataKey="probRed" name="Red (Failure)" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expected State Cost Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="mb-1">Expected State Cost Over Time</h3>
              <p className="text-xs text-gray-600 mb-4">How expected costs evolve for Not-Red and Red states</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#6b7280"
                    label={{ value: 'Decision Period (n)', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    label={{ value: 'Expected Cost ($)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine
                    x={optimalInterventionPeriod}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: `n* = ${optimalInterventionPeriod}`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 11,
                      fontWeight: 'bold',
                    }}
                  />
                  <Line type="monotone" dataKey="costNotRed" name="Cost (Green/Yellow)" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
                  <Line type="monotone" dataKey="costRed" name="Cost (Red)" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>

              {/* Expected state cost summary cards */}
              {esc && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                    <div className="text-xs text-green-700 font-medium">🟢 Green</div>
                    <div className="text-sm font-bold text-green-900">${esc.green.toFixed(2)}</div>
                    <div className="text-xs text-green-600">{(esc.greenProb * 100).toFixed(1)}% prob.</div>
                  </div>
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <div className="text-xs text-yellow-700 font-medium">🟡 Yellow</div>
                    <div className="text-sm font-bold text-yellow-900">${esc.yellow.toFixed(2)}</div>
                    <div className="text-xs text-yellow-600">{(esc.yellowProb * 100).toFixed(1)}% prob.</div>
                  </div>
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                    <div className="text-xs text-red-700 font-medium">🔴 Red</div>
                    <div className="text-sm font-bold text-red-900">${esc.red.toFixed(2)}</div>
                    <div className="text-xs text-red-600">{(esc.redProb * 100).toFixed(1)}% prob.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Spare Parts to Bring Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-gray-700" />
                <h3>Spare Parts to Bring</h3>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Optimal number of spare parts per maintenance visit. 🔵 Preventive &nbsp;|&nbsp; 🔴 Corrective
              </p>
              {sparePartsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="period"
                      type="number"
                      name="Period"
                      stroke="#6b7280"
                      domain={[0, maxPeriod - 1]}
                      label={{ value: 'Decision Period (n)', position: 'insideBottom', offset: -5, fill: '#6b7280' }}
                    />
                    <YAxis
                      dataKey="parts"
                      type="number"
                      name="Spare Parts"
                      stroke="#6b7280"
                      allowDecimals={false}
                      label={{ value: 'Spare Parts (a)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: string) => [`${value} parts`, name]}
                      labelFormatter={(label) => `Period n = ${label}`}
                    />
                    <Scatter name="Preventive" data={preventivePoints} fill="#2563eb">
                      {preventivePoints.map((_, i) => (
                        <Cell key={i} fill="#2563eb" />
                      ))}
                    </Scatter>
                    <Scatter name="Corrective" data={correctivePoints} fill="#dc2626">
                      {correctivePoints.map((_, i) => (
                        <Cell key={i} fill="#dc2626" />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  No spare part data available — run optimization first.
                </div>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                  Preventive visit (not-red)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
                  Corrective visit (failure)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Policy Table */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="mb-1">Detailed State Policies &amp; Costs</h2>
              <p className="text-sm text-gray-600">
                Recommended actions, expected costs, and probabilities for each signal state per period
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Period (n)</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Signal</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Recommended Action</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Type</th>
                    <th className="text-center py-3 px-6 text-sm font-medium text-gray-700">Spare Parts</th>
                    <th className="text-right py-3 px-6 text-sm font-medium text-gray-700">Probability</th>
                    <th className="text-right py-3 px-6 text-sm font-medium text-gray-700">Expected Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {policyData.map((item, index) => {
                    const isRed = item.signalState === 'Red';
                    const isCorrective = item.actionValue === 2;
                    return (
                      <tr
                        key={index}
                        className={`border-b border-gray-100 transition-colors ${
                          item.isOptimalPoint
                            ? 'bg-blue-50 border-l-4 border-l-blue-600'
                            : isCorrective
                            ? 'bg-red-50 border-l-4 border-l-red-500'
                            : index % 2 === 0
                            ? 'bg-white'
                            : 'bg-gray-50/50'
                        } hover:bg-gray-100`}
                      >
                        <td className="py-4 px-6">
                          <span className={`text-sm font-semibold ${item.isOptimalPoint ? 'text-blue-600' : 'text-gray-900'}`}>
                            n = {item.counterLevel}
                            {item.isOptimalPoint && (
                              <span className="ml-2 text-xs font-normal text-blue-600">← PM Point</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getSignalBadgeClass(item.signalState)}`}>
                            {getSignalDot(item.signalState)} {item.signalState}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            item.actionValue === 0
                              ? 'bg-gray-100 text-gray-700'
                              : isCorrective
                              ? 'bg-red-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {item.recommendedAction}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700">
                          {item.actionType}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {item.optimalSpareParts > 0 ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              isCorrective ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              <Package className="w-3 h-3" />
                              {item.optimalSpareParts}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700 text-right">
                          {(item.probability * 100).toFixed(2)}%
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-gray-900 text-right">
                          ${item.expectedCost.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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