import { useSearchParams } from 'react-router-dom';
import {
  EndpointsTab,
  RolesTab,
  SettingsTab,
  TestRunsTab,
} from '../components/project-detail';
import { PerformanceTab } from '../components/performance/PerformanceTab';
import { FlowTestingTab } from '../components/flow-testing/FlowTestingTab';
import { useProjectContext } from '../contexts/ProjectContext';

type Tab = 'endpoints' | 'roles' | 'test-runs' | 'performance' | 'flow-testing' | 'settings';

function getActiveTab(value: string | null): Tab {
  if (value === 'roles' || value === 'test-runs' || value === 'performance' || value === 'flow-testing' || value === 'settings') {
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
      {activeTab === 'flow-testing' ? <FlowTestingTab project={project} /> : null}
      {activeTab === 'settings' ? (
        <SettingsTab project={project} onUpdated={setProject} />
      ) : null}
    </>
  );
}
