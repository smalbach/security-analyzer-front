import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ProjectContext } from '../../contexts/ProjectContext';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { useProject } from '../../features/projects/hooks';
import { ProjectSidebar } from '../project-detail/ProjectSidebar';

export function ProjectShell() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectState = useProject(projectId);
  const { loading, error, project } = projectState;
  const { setActiveProject } = useActiveProject();

  useEffect(() => {
    if (project) {
      setActiveProject({ id: project.id, name: project.name });
    }
    return () => {
      setActiveProject(null);
    };
  }, [project, setActiveProject]);

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>
        Loading project...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-red-400">{error}</div>
    );
  }

  return (
    <ProjectContext.Provider value={projectState}>
      <div className="project-layout-shell">
        <ProjectSidebar />
        <main className="project-content-area">
          <Outlet />
        </main>
      </div>
    </ProjectContext.Provider>
  );
}
