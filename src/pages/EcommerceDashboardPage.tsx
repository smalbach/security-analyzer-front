import {
  WelcomeCard,
  EcomStatCard,
  SecurityScoreChart,
  ScoreHistoryChart,
  VulnerabilitiesChart,
  RecentTestRuns,
  ProjectsOverview,
  TestRunsByStatus,
  FlowTestingOverview,
} from '../components/dashboard';
import { useDashboardStats } from '../hooks/useDashboardStats';

const ProjectsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const EndpointsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const TestRunsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const PerfIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const FlowIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4zM7 10v4l5 3M17 14v-4l-5-3" />
  </svg>
);

const GroupIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

export function EcommerceDashboardPage() {
  const { stats, loading, error, refresh } = useDashboardStats();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-tide-400 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <div className="dash-card text-center">
          <p className="text-rose-400">Failed to load dashboard</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button type="button" onClick={() => void refresh()} className="mt-4 rounded-lg bg-tide-500/15 px-4 py-2 text-sm text-tide-400 transition hover:bg-tide-500/25">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { overview, security, flowTesting, performance, recentTestRuns, recentProjects, testRunsByStatus, scoreHistory, topVulnerabilities } = stats;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Security Dashboard</h1>
        <nav className="text-xs text-slate-500">
          <span className="text-tide-400">Dashboard</span>
          <span className="mx-1.5">&gt;</span>
          <span>Overview</span>
        </nav>
      </div>

      {/* Row 1: Welcome + Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <WelcomeCard />
        <EcomStatCard
          title="Projects"
          value={String(overview.totalProjects)}
          change={0}
          icon={<ProjectsIcon />}
        />
        <EcomStatCard
          title="Endpoints"
          value={overview.totalEndpoints.toLocaleString()}
          change={0}
          icon={<EndpointsIcon />}
        />
        <EcomStatCard
          title="Test Runs"
          value={String(overview.totalTestRuns)}
          change={0}
          icon={<TestRunsIcon />}
        />
        <EcomStatCard
          title="Avg Score"
          value={security.averageScore > 0 ? `${security.averageScore}%` : '—'}
          change={0}
          icon={<PerfIcon />}
        />
      </div>

      {/* Row 1b: Flow & Perf Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EcomStatCard
          title="Flow Tests"
          value={String(flowTesting?.totalFlows ?? 0)}
          change={0}
          icon={<FlowIcon />}
        />
        <EcomStatCard
          title="Flow Groups"
          value={String(flowTesting?.totalGroups ?? 0)}
          change={0}
          icon={<GroupIcon />}
        />
        <EcomStatCard
          title="Flow Pass Rate"
          value={flowTesting?.passRate > 0 ? `${flowTesting.passRate}%` : '—'}
          change={0}
          icon={<TestRunsIcon />}
        />
        <EcomStatCard
          title="Avg Response (Perf)"
          value={performance?.averageResponseTime > 0 ? `${performance.averageResponseTime}ms` : '—'}
          change={0}
          icon={<PerfIcon />}
        />
      </div>

      {/* Row 2: Security Score + Vulnerabilities */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SecurityScoreChart
          score={security.averageScore}
          totalPassed={security.totalPassed}
          totalFailed={security.totalFailed}
        />
        <VulnerabilitiesChart data={topVulnerabilities} />
      </div>

      {/* Row 3: Score History */}
      <ScoreHistoryChart data={scoreHistory} />

      {/* Row 4: Flow Testing Overview */}
      {flowTesting && <FlowTestingOverview data={flowTesting} />}

      {/* Row 5: Recent Test Runs */}
      <RecentTestRuns runs={recentTestRuns} />

      {/* Row 6: Projects + Test Runs by Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProjectsOverview projects={recentProjects} />
        <TestRunsByStatus data={testRunsByStatus} />
      </div>
    </div>
  );
}
