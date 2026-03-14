import { Route, Routes } from 'react-router-dom';
import { AnalysisDashboard } from '../AnalysisDashboard';
import { ProtectedRoute } from '../ProtectedRoute';
import { ProjectShell } from './ProjectShell';
import { AnalysisPage } from '../../pages/AnalysisPage';
import { EcommerceDashboardPage } from '../../pages/EcommerceDashboardPage';
import { EndpointEditorPage } from '../../pages/EndpointEditorPage';
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage';
import { LoginPage } from '../../pages/LoginPage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { ProjectDetailPage } from '../../pages/ProjectDetailPage';
import { ProjectsPage } from '../../pages/ProjectsPage';
import { RegisterPage } from '../../pages/RegisterPage';
import { ReportPage } from '../../pages/ReportPage';
import { ResetPasswordPage } from '../../pages/ResetPasswordPage';
import { TestRunPage } from '../../pages/TestRunPage';
import { PerfExecutionPage } from '../../pages/PerfExecutionPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/projects"
        element={(
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/projects/:projectId"
        element={(
          <ProtectedRoute>
            <ProjectShell />
          </ProtectedRoute>
        )}
      >
        <Route index element={<ProjectDetailPage />} />
        <Route path="endpoints/:endpointId" element={<EndpointEditorPage />} />
        <Route path="test-runs/:runId" element={<TestRunPage />} />
        <Route path="perf-executions/:execId" element={<PerfExecutionPage />} />
      </Route>
      <Route
        path="/analysis/new"
        element={(
          <ProtectedRoute>
            <AnalysisPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/history"
        element={(
          <ProtectedRoute>
            <AnalysisDashboard />
          </ProtectedRoute>
        )}
      />

      <Route path="/dashboard/ecommerce" element={<ProtectedRoute><EcommerceDashboardPage /></ProtectedRoute>} />

      <Route path="/analysis/:id" element={<ReportPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
