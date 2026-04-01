import { Link } from 'react-router';
import { ArrowRight, Users, Target, Lightbulb, GraduationCap } from 'lucide-react';

export function HomePage() {
  const teamMembers = [
    'Ada Dila Akbulut',
    'Ahmet Selim Erdoğan',
    'Aksel Ünlü',
    'Ekin Savaş',
    'Ömer Kürşad Pınar',
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="mb-4">Maintenance Optimization Tool</h1>
          <p className="text-lg text-muted-foreground">
            A web-based decision-support tool for optimal maintenance strategies
          </p>
        </header>

        <section className="mb-12 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-6 h-6 text-primary" />
            <h2>Project Background</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed">
            Industrial systems often consist of multiple components that deteriorate over time. Determining when maintenance should be performed is an important problem because early maintenance increases operational cost, while delayed maintenance increases the risk of system failure.
          </p>
          <p className="text-foreground/90 leading-relaxed mt-4">
            This project develops a web-based decision-support tool that helps determine optimal maintenance strategies using an optimization model.
          </p>
        </section>

        <section className="mb-12 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-primary" />
            <h2>Research Motivation</h2>
          </div>
          <p className="text-foreground/90 leading-relaxed">
            Many advanced maintenance optimization models exist in academic research. However, these models are usually implemented in programming environments and are difficult for non-technical users to access.
          </p>
          <p className="text-foreground/90 leading-relaxed mt-4">
            The purpose of this project is to make such models easier to use by developing a web interface that allows users to run the optimization model and understand the results without needing programming knowledge.
          </p>
        </section>

        <section className="mb-12 bg-card border border-border rounded-lg p-8">
          <h2 className="mb-4">Project Objective</h2>
          <p className="text-foreground/90 leading-relaxed mb-4">
            The main objective of this project is to create a web-based interface that allows users to:
          </p>
          <ul className="space-y-2 ml-6">
            <li className="text-foreground/90 flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Enter system parameters</span>
            </li>
            <li className="text-foreground/90 flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Run an optimization model</span>
            </li>
            <li className="text-foreground/90 flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Analyze the optimal maintenance policy</span>
            </li>
            <li className="text-foreground/90 flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>View results through tables and visualizations</span>
            </li>
          </ul>
          <p className="text-foreground/90 leading-relaxed mt-4">
            The system helps users understand how maintenance decisions affect long-term operational costs.
          </p>
        </section>

        <section className="mb-12 bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h2>University / Course Information</h2>
          </div>
          <h3 className="mb-2">Application of Markov Decision Processes to Maintenance Interventions in Partially Observable Multi-Component Systems</h3>
          <p className="text-muted-foreground">University: Sabancı University</p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <section className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2>Team Members</h2>
            </div>
            <ul className="space-y-2">
              {teamMembers.map((member, index) => (
                <li key={index} className="text-foreground/90">
                  {member}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-card border border-border rounded-lg p-8">
            <h2 className="mb-4">Supervisor</h2>
            <p className="text-foreground/90">Mehmet Murat Fadıloğlu</p>
          </section>
        </div>

        <div className="text-center">
          <Link
            to="/model-setup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Optimization
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}