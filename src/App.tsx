import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavHeader } from './components/NavHeader';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { AnalysisPage } from './pages/AnalysisPage';
import { ReportPage } from './pages/ReportPage';

function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen overflow-hidden bg-slatewave-950 text-slate-100">
        <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-tide-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-32 h-72 w-72 animate-drift rounded-full bg-ember-500/20 blur-3xl" />

        <NavHeader />

        <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
          <Routes>
            <Route path="/" element={<AnalysisDashboard />} />
            <Route path="/new" element={<AnalysisPage />} />
            <Route path="/analysis/:id" element={<ReportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
