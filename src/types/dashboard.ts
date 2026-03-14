export interface DashboardStats {
  overview: {
    totalProjects: number;
    totalEndpoints: number;
    totalTestRuns: number;
    totalPerfExecutions: number;
  };
  security: {
    averageScore: number;
    totalChecks: number;
    totalPassed: number;
    totalFailed: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  recentTestRuns: {
    id: string;
    projectName: string;
    label: string | null;
    status: string;
    securityScore: number | null;
    riskLevel: string | null;
    totalEndpoints: number;
    totalPassed: number;
    totalFailed: number;
    completedAt: string | null;
    createdAt: string;
  }[];
  recentProjects: {
    id: string;
    name: string;
    description: string | null;
    endpointCount: number;
    testRunCount: number;
    lastTestScore: number | null;
    createdAt: string;
    updatedAt: string;
  }[];
  testRunsByStatus: Record<string, number>;
  scoreHistory: {
    date: string;
    score: number;
    projectName: string;
  }[];
  topVulnerabilities: {
    rule: string;
    count: number;
    severity: string;
  }[];
}
