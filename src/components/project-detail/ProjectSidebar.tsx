import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useOptionalProjectContext } from '../../contexts/ProjectContext';
import {
  ArrowLeftIcon,
  EndpointsIcon,
  FlowTestingIcon,
  HelpIcon,
  PerformanceIcon,
  RolesIcon,
  SettingsIcon,
  TestRunIcon,
} from '../ui/Icon';
import { HelpTooltip } from '../ui/HelpTooltip';
import { useHelp } from '../../contexts/HelpContext';

type Tab = 'endpoints' | 'roles' | 'test-runs' | 'performance' | 'flow-testing' | 'settings';

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tooltip: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'endpoints',
    label: 'Endpoints',
    icon: EndpointsIcon,
    tooltip: 'List and manage all API endpoints of your project. Each endpoint is a URL your API exposes.',
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: RolesIcon,
    tooltip: 'Define user roles (Admin, User, etc.) and control which endpoints each role can access.',
  },
  {
    id: 'test-runs',
    label: 'Test Runs',
    icon: TestRunIcon,
    tooltip: 'Automatically test your API for security vulnerabilities. One click runs 17+ security checks.',
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: PerformanceIcon,
    tooltip: 'Simulate many users hitting your API at once to see how it performs under load.',
  },
  {
    id: 'flow-testing',
    label: 'Flow Testing',
    icon: FlowTestingIcon,
    tooltip: 'Build visual E2E API test flows. Chain requests, validate schemas, run assertions, and test with datasets.',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    tooltip: 'Configure your project\'s base URL, authentication, and other global settings.',
  },
];

function getActiveTab(tabParam: string | null, pathname: string): Tab {
  // First check the explicit tab query parameter
  if (
    tabParam === 'roles' ||
    tabParam === 'test-runs' ||
    tabParam === 'performance' ||
    tabParam === 'flow-testing' ||
    tabParam === 'settings'
  ) {
    return tabParam;
  }

  // Derive from pathname for sub-routes (e.g. /projects/:id/flows/:flowId)
  if (pathname.includes('/flows/') || pathname.includes('/flows')) return 'flow-testing';
  if (pathname.includes('/test-runs/')) return 'test-runs';
  if (pathname.includes('/perf-executions')) return 'performance';
  if (pathname.includes('/endpoints/')) return 'endpoints';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/roles')) return 'roles';

  // Default when on the base project page
  return tabParam === 'endpoints' || tabParam === null ? 'endpoints' : 'endpoints';
}

export function ProjectSidebar() {
  const ctx = useOptionalProjectContext();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const { openHelp } = useHelp();
  const navigate = useNavigate();

  if (!ctx?.project) return null;

  const { project } = ctx;
  const location = useLocation();
  const activeTab = getActiveTab(searchParams.get('tab'), location.pathname);

  function setTab(tab: Tab) {
    navigate(`/projects/${projectId}?tab=${tab}`);
  }

  return (
    <aside className="project-sidebar">
      {/* Project info */}
      <div className="project-sidebar-project-info">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="project-sidebar-back-btn"
        >
          <ArrowLeftIcon width={14} height={14} />
          <span>All Projects</span>
        </button>
        <div
          className="mt-3 mb-2 h-0.5 w-8 rounded-full"
          style={{ background: 'rgb(var(--accent-400))' }}
        />
        <p
          className="truncate text-sm font-semibold leading-snug"
          style={{ color: 'var(--text-primary)' }}
          title={project.name}
        >
          {project.name}
        </p>
        {project.baseUrl ? (
          <p
            className="mt-0.5 truncate font-mono text-xs"
            style={{ color: 'var(--text-secondary)' }}
            title={project.baseUrl}
          >
            {project.baseUrl}
          </p>
        ) : null}
      </div>

      {/* Nav items */}
      <nav className="project-sidebar-nav" aria-label="Project sections">
        <div className="project-sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map(({ id, label, icon: Icon, tooltip }) => (
          <div key={id} className="project-sidebar-item-row">
            <button
              type="button"
              onClick={() => setTab(id)}
              className={`project-sidebar-item flex-1 ${activeTab === id ? 'project-sidebar-item-active' : ''}`}
            >
              <Icon width={18} height={18} className="flex-shrink-0 opacity-75" />
              <span className="flex-1">{label}</span>
            </button>
            <HelpTooltip content={tooltip} position="right" />
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="project-sidebar-footer">
        <button
          type="button"
          onClick={() => openHelp()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <HelpIcon width={16} height={16} />
          <span>Help &amp; Docs</span>
        </button>
      </div>
    </aside>
  );
}
