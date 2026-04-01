import { useNavigate } from 'react-router';
import { ArrowLeft, Network, Layers, Wrench, TrendingUp } from 'lucide-react';

export function ModelExplanationPage() {
  const navigate = useNavigate();

  const deteriorationLevels = [
    { level: 'Level 0', description: 'Healthy condition' },
    { level: 'Level 1', description: 'Slight deterioration' },
    { level: 'Level 2', description: 'Moderate deterioration' },
    { level: 'Level 3', description: 'Severe deterioration' },
    { level: 'Level 4', description: 'Failure' },
  ];

  const maintenanceActions = [
    { action: 'Continue Operation', description: 'No intervention, system continues normal operation' },
    { action: 'Preventive Maintenance', description: 'Scheduled maintenance to prevent deterioration' },
    { action: 'Corrective Maintenance', description: 'Repair action to fix deteriorated components' },
  ];

  const optimizationFactors = [
    'System deterioration behavior',
    'Maintenance costs',
    'Repair success rates',
    'System dynamics over time',
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
            <h2>Markov Decision Process Model</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-4">
            The optimization model used in this system is based on a Markov Decision Process (MDP). This framework is used to model systems that evolve over time and require decisions under uncertainty.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            The MDP model represents the system as a set of states and actions. Each state describes the condition of the system, while actions represent possible maintenance decisions.
          </p>
        </section>

        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="w-6 h-6 text-primary" />
            <h2>Deterioration States</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-6">
            System components deteriorate gradually over time. This deterioration is represented by discrete levels.
          </p>
          <div className="space-y-3">
            {deteriorationLevels.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                <div>
                  <div className="font-medium">{item.level}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="w-6 h-6 text-primary" />
            <h2>Maintenance Actions</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed mb-6">
            The model considers different actions that can be taken at each system state. Each action has an associated cost.
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
            The model evaluates different maintenance decisions and determines the strategy that minimizes long-term expected cost.
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