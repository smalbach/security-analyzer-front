import { useSearchParams } from 'react-router-dom';
import {
  EndpointsTab,
  RolesTab,
  SettingsTab,
  TestRunsTab,
} from '../components/project-detail';
import { PerformanceTab } from '../components/performance/PerformanceTab';
import { useProjectContext } from '../contexts/ProjectContext';

type Tab = 'endpoints' | 'roles' | 'test-runs' | 'performance' | 'settings';

function getActiveTab(value: string | null): Tab {
  if (value === 'roles' || value === 'test-runs' || value === 'performance' || value === 'settings') {
    return value;
  }
  return 'endpoints';
}

export function ProjectDetailPage() {
  const { project, setProject } = useProjectContext();
  const [searchParams] = useSearchParams();

  const activeTab = getActiveTab(searchParams.get('tab'));

  if (!project) return null;

  return (
    <>
      {activeTab === 'endpoints' ? <EndpointsTab project={project} /> : null}
      {activeTab === 'roles' ? <RolesTab project={project} /> : null}
      {activeTab === 'test-runs' ? <TestRunsTab project={project} /> : null}
      {activeTab === 'performance' ? <PerformanceTab project={project} /> : null}
      {activeTab === 'settings' ? (
        <SettingsTab project={project} onUpdated={setProject} />
      ) : null}
    </>
  );
}
