import { BrowserRouter as Router, Routes, Route } from 'react-router';
import { HomePage } from './components/HomePage';
import { ModelSetupPage } from './components/ModelSetupPage';
import { ResultsPage } from './components/ResultsPage';
import { ModelExplanationPage } from './components/ModelExplanationPage';
import { Navigation } from './components/Navigation';
import { OptimizationProvider } from './context/OptimizationContext';

export default function App() {
  return (
    <Router>
      <OptimizationProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/model-setup" element={<ModelSetupPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/model-explanation" element={<ModelExplanationPage />} />
        </Routes>
      </OptimizationProvider>
    </Router>
  );
}