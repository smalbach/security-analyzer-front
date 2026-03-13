import { useParams, useSearchParams } from 'react-router-dom';
import {
  EndpointsTab,
  ProjectDetailHeader,
  RolesTab,
  SettingsTab,
  TestRunsTab,
} from '../components/project-detail';
import { TabBar } from '../components/ui';
import { useProject } from '../features/projects/hooks';

type Tab = 'endpoints' | 'roles' | 'test-runs' | 'settings';

const PROJECT_TABS: { id: Tab; label: string }[] = [
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'roles', label: 'Roles' },
  { id: 'test-runs', label: 'Test Runs' },
  { id: 'settings', label: 'Settings' },
];

function getActiveTab(value: string | null): Tab {
  if (value === 'roles' || value === 'test-runs' || value === 'settings') {
    return value;
  }

  return 'endpoints';
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = getActiveTab(searchParams.get('tab'));
  const { project, loading, error, setProject } = useProject(projectId);

  const setTab = (tab: Tab) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', tab);
    setSearchParams(nextSearchParams);
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading project...</div>;
  }

  if (error) {
    return <div className="py-20 text-center text-red-400">{error}</div>;
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      <ProjectDetailHeader project={project} />

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl">
        <TabBar
          tabs={PROJECT_TABS}
          activeTab={activeTab}
          onChange={setTab}
          className="border-b border-white/10 px-0"
        />

        <div className="p-6">
          {activeTab === 'endpoints' ? <EndpointsTab project={project} /> : null}
          {activeTab === 'roles' ? <RolesTab project={project} /> : null}
          {activeTab === 'test-runs' ? <TestRunsTab project={project} /> : null}
          {activeTab === 'settings' ? (
            <SettingsTab project={project} onUpdated={setProject} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
