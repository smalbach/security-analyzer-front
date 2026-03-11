import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NavHeader } from './components/NavHeader';
import { MatrixRain } from './components/MatrixRain';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { AnalysisPage } from './pages/AnalysisPage';
import { ReportPage } from './pages/ReportPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { EndpointEditorPage } from './pages/EndpointEditorPage';
import { TestRunPage } from './pages/TestRunPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AppShell() {
  const { theme } = useTheme();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slatewave-950 text-slate-100">
      {/* Background orbs */}
      <div
        className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--glow-orb-1)' }}
      />
      <div
        className="pointer-events-none absolute right-0 top-32 h-72 w-72 animate-drift rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--glow-orb-2)' }}
      />

      {/* Matrix effects */}
      {theme === 'matrix' ? (
        <>
          <MatrixRain />
          <div className="matrix-scanline" />
        </>
      ) : null}

      <NavHeader />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
        <Routes>
          {/* Auth routes (public) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/endpoints/:endpointId"
            element={
              <ProtectedRoute>
                <EndpointEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/test-runs/:runId"
            element={
              <ProtectedRoute>
                <TestRunPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis/new"
            element={
              <ProtectedRoute>
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AnalysisDashboard />
              </ProtectedRoute>
            }
          />

          {/* Public access (supports shared reports) */}
          <Route path="/analysis/:id" element={<ReportPage />} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
