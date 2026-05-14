import { useNavigate } from 'react-router';
import { ArrowLeft, Network, Eye, Wrench, TrendingUp, Clock, Users } from 'lucide-react';

export function ModelExplanationPage() {
  const navigate = useNavigate();

  const maintenanceActions = [
    {
      action: 'Wait',
      color: 'gray',
      description: 'No intervention is performed. The system continues normal operation and the counter level n increments by one.',
    },
    {
      action: 'Preventive Maintenance',
      color: 'blue',
      description: 'Planned maintenance performed upon favorable conditions (not-red / green or yellow signal), before any failure is detected. This is the preferred strategy as it avoids costly emergency repairs.',
    },
    {
      action: 'Corrective Maintenance',
      color: 'red',
      description: 'Emergency repair triggered after a failure is detected (red signal). This is costlier and includes a higher base cost, transfer cost, and spare part costs.',
      withSpareParts: true,
    },
  ];

  const optimizationFactors = [
    'Time since last maintenance (decision period n)',
    'Signal state (Green, Yellow, or Red)',
    'Maintenance costs (preventive vs. corrective)',
    'Probability of system failure over time',
    'Spare part holding and transfer costs',
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-4">Model Explanation</h1>
        </div>

        {/* POMDP Section */}
        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Network className="w-6 h-6 text-primary" />
            <h2>Partially Observable Markov Decision Process (POMDP)</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-4">
            The optimization model used in this system is based on a Partially Observable Markov Decision Process (POMDP). This framework is designed for systems where you cannot observe the exact state of all components.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            Unlike traditional models where you can see exactly how deteriorated each component is, this model only knows whether a failure has occurred or not. This reflects real-world scenarios where monitoring individual component states is expensive or impossible.
          </p>
        </section>

        {/* Signal States — 3 signals */}
        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-primary" />
            <h2>Signal States (What the System Observes)</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-6">
            The system observes three signal states based on the counter level <strong>n</strong> (time since last maintenance):
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-4 h-4 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
              <div>
                <div className="font-semibold text-green-900">🟢 Green Signal (n = 0, embedded)</div>
                <div className="text-sm text-green-700 mt-1">
                  The system is in a freshly maintained state. Counter is at zero — all components were just restored to green. <strong>No intervention needed.</strong> This state is always present at the start of each maintenance cycle.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="w-4 h-4 rounded-full bg-yellow-500 mt-1 flex-shrink-0"></div>
              <div>
                <div className="font-semibold text-yellow-900">🟡 Yellow Signal (n ≥ 1, Not-Red)</div>
                <div className="text-sm text-yellow-700 mt-1">
                  No component failures detected yet, but the system has been running for at least one period since last maintenance. Components may be deteriorating. The model weighs the cost of waiting vs. intervening.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-4 h-4 rounded-full bg-red-600 mt-1 flex-shrink-0"></div>
              <div>
                <div className="font-semibold text-red-900">🔴 Red Signal (Failure Detected)</div>
                <div className="text-sm text-red-700 mt-1">
                  At least one component has failed. Corrective maintenance is triggered immediately. This incurs a higher base cost and includes spare part logistics.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Decision Period */}
        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-primary" />
            <h2>Decision Period (n)</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Since the system cannot observe exact component states, decisions are based on <strong>time since last maintenance</strong> (decision period n).
          </p>
          <p className="text-foreground/90 leading-relaxed">
            As time passes without maintenance, the probability of component failure increases. The model determines the optimal <strong>Preventive Maintenance Point (n*)</strong> — the threshold at which planned maintenance is cost-optimal, balancing early intervention cost against failure risk.
          </p>
        </section>

        {/* Maintenance Actions */}
        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="w-6 h-6 text-primary" />
            <h2>Maintenance Actions</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-6">
            At each decision period, the model chooses between three actions based on the signal state and time since last maintenance:
          </p>
          <div className="space-y-4">
            {maintenanceActions.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  item.color === 'red'
                    ? 'bg-red-50 border-red-200'
                    : item.color === 'blue'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <h3 className={`mb-2 ${item.color === 'red' ? 'text-red-800' : item.color === 'blue' ? 'text-blue-800' : ''}`}>
                  {item.action}
                </h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.withSpareParts && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
                    <p className="text-xs text-red-800">
                      <strong>Spare Parts:</strong> When performing corrective maintenance, the model decides how many spare parts to bring. Bringing too few incurs an <em>underage cost</em>; bringing too many incurs an <em>overage cost</em>.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Survivor Interpretation */}
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-indigo-700" />
              <span className="font-semibold text-indigo-900 text-sm">Survivor Interpretation</span>
            </div>
            <p className="text-sm text-indigo-800 leading-relaxed">
              The probability distributions shown in the results are computed under the <strong>survivor condition</strong>: they represent the conditional distribution of system states, given that no failure has occurred yet (the "survivor" trajectory). This means the Yellow-state probabilities reflect only those runs where the system has not yet transitioned to Red.
            </p>
          </div>
        </section>

        {/* Optimization Process — MF Programming */}
        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2>Optimization Process</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-6">
            The model uses <strong>MF (Mathematical Formulation) Programming</strong> — a flow-balance optimization framework — to find the optimal intervention threshold (n*) that minimizes the long-run average cost per period. This threshold tells you exactly when to perform preventive maintenance.
          </p>
          <p className="text-foreground/90 leading-relaxed mb-4">
            The optimization process considers:
          </p>
          <ul className="space-y-2">
            {optimizationFactors.map((factor, index) => (
              <li key={index} className="flex items-start gap-2 text-foreground/90">
                <span className="text-primary mt-1">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Result:</strong> The MF program outputs the optimal Preventive Maintenance Point (n*) and the optimal number of spare parts to bring at each visit, balancing cost and system reliability over the long run.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => navigate('/results')}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}