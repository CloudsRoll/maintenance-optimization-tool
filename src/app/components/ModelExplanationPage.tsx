import { useNavigate } from 'react-router';
import { ArrowLeft, Network, Eye, Wrench, TrendingUp, Clock } from 'lucide-react';

export function ModelExplanationPage() {
  const navigate = useNavigate();

  const maintenanceActions = [
    { action: 'Wait', description: 'No intervention, system continues normal operation' },
    { action: 'Preventive Maintenance', description: 'Scheduled maintenance before failure occurs' },
    { action: 'Corrective Maintenance', description: 'Emergency repair after failure is detected' },
  ];

  const optimizationFactors = [
    'Time since last maintenance (decision period n)',
    'Signal state (Not-Red or Red)',
    'Maintenance costs (preventive vs. corrective)',
    'Probability of system failure over time',
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-4">Model Explanation</h1>
        </div>

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

        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-primary" />
            <h2>Signal States (What the System Observes)</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-6">
            The system can only observe two signal states, not the exact condition of individual components:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <div className="font-medium text-yellow-900">Healthy-Warning Signal (Not-Red)</div>
                <div className="text-sm text-yellow-700 mt-1">No component failures detected. Components may be deteriorating, but the system is still operational.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-red-600 mt-2"></div>
              <div>
                <div className="font-medium text-red-900">Red Signal (Failure Detected)</div>
                <div className="text-sm text-red-700 mt-1">At least one component has failed. Corrective maintenance is required immediately.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-primary" />
            <h2>Decision Period (n)</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-4">
            Since the system cannot observe exact component states, decisions are based on <strong>time since last maintenance</strong> (decision period n).
          </p>
          <p className="text-foreground/90 leading-relaxed">
            As time passes without maintenance, the probability of component failure increases. The model determines the optimal period (n*) to perform preventive maintenance, balancing the cost of early intervention against the risk of failure.
          </p>
        </section>

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
              <div key={index} className="p-4 bg-muted/30 rounded-lg">
                <h3 className="mb-2">{item.action}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2>Optimization Process</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-6">
            The model uses Linear Programming to find the optimal intervention threshold (n*) that minimizes the long-run average cost per period. This threshold tells you exactly when to perform preventive maintenance.
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
              <strong>Result:</strong> The model outputs the optimal decision period (n*) where you should perform preventive maintenance to balance cost and reliability.
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