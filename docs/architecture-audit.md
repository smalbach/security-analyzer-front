# Frontend Architecture Audit

Fecha: 2026-03-12

## Resumen Ejecutivo

El proyecto ya mejoró bastante en separación visual y en componentes por dominio, pero todavía tiene cuatro problemas estructurales:

1. La capa de datos sigue demasiado acoplada a la UI.
2. El estado remoto se maneja manualmente en casi todas las páginas.
3. Hay mucha lógica derivada viviendo dentro de componentes grandes.
4. La app tiene una capa visual potente, pero el sistema de estilos sigue centralizado en un `index.css` monolítico.

Si el objetivo es hacerla realmente escalable y mantenible, la ruta correcta es:

- Separar `server state`, `client state`, `presentation` y `domain helpers`.
- Romper `lib/api.ts` y `types/api.ts` en módulos por feature.
- Introducir hooks de datos por feature (`useProjects`, `useProject`, `useEndpoints`, `useTestRun`, etc.).
- Mover derivaciones pesadas a `selectors`, `mappers` y `helpers` puros.
- Reducir `index.css` a tokens/globales y mover el resto a archivos de tema o capas CSS dedicadas.

## Prioridades Reales

### P0

- Partir `src/lib/api.ts` en servicios por dominio.
- Partir `src/types/api.ts` en tipos por feature.
- Introducir una estrategia unificada para fetch, cache, retry, cancelación y loading/error.
- Reducir `src/index.css` en módulos de tema.
- Estandarizar errores, confirmaciones y notificaciones; hoy se usan `alert`, `confirm`, banners locales y silencios.

### P1

- Crear hooks por recurso y reemplazar `useEffect + useState + callback` repetidos.
- Sacar lógica de filtros, paginación y forms a hooks/helpers reutilizables.
- Crear una capa de `selectors` para resultados, reportes y árboles de endpoints.
- Virtualizar listas largas (`endpoint tree`, tablas, results) si el backend escala.

### P2

- Mover rutas a route objects con lazy loading.
- Añadir tests unitarios a utilidades y tests de integración a flows críticos.
- Definir una convención de feature public API y limitar barrels.

## Arquitectura Objetivo

```text
src/
  app/
    routes/
    providers/
    layout/
  shared/
    ui/
    lib/
    utils/
    hooks/
    constants/
    types/
  services/
    http/
    api/
  state/
    auth/
    theme/
    ui/
  features/
    auth/
    projects/
    project-detail/
    endpoints/
    test-runs/
    analysis/
    reports/
```

## Mejoras Globales Recomendadas

- Introducir una librería de server state. La recomendación más clara es `@tanstack/react-query`.
- Añadir `AbortController` a cargas de página/modales para evitar `setState` tardío.
- Añadir `zod` o validación similar para DTOs críticos y formularios.
- Estandarizar helpers compartidos:
  - `src/shared/utils/date.ts`
  - `src/shared/utils/download.ts`
  - `src/shared/utils/error.ts`
  - `src/shared/utils/query.ts`
  - `src/shared/utils/string.ts`
  - `src/shared/utils/object.ts`
- Estandarizar hooks reutilizables:
  - `useDebouncedValue`
  - `useAsyncTask`
  - `useModalState`
  - `usePaginationState`
  - `useQueryFilters`
- Crear stores UI transversales:
  - `toast.store.ts`
  - `confirmDialog.store.ts`
  - `pageLoading.store.ts`
- Definir `view models` donde hoy se renderiza directamente con DTO crudo del backend.
- Unificar idioma. Hoy hay mezcla English/Espanol en textos, errores y labels.
- Revisar encoding. Hay rastros de texto con mojibake en varios archivos.
- Estandarizar un solo gestor de paquetes. Hoy conviven `package-lock.json` y `pnpm-lock.yaml`.

## Analisis Por Archivo

### Root / Config

- `package.json`: falta capa de calidad (`lint`, `test`, `typecheck`, `format`); añadir scripts de CI.
- `package-lock.json`: conservar solo si npm es el gestor oficial; si no, eliminarlo del flujo.
- `pnpm-lock.yaml`: mismo criterio anterior; no mantener dos locks.
- `tsconfig.json`: buena base strict; añadir aliases (`paths`) para evitar imports relativos largos.
- `vite.config.ts`: extraer `proxy` y env helpers; preparar `manualChunks` si el bundle sigue creciendo.
- `tailwind.config.js`: mantener tokens base aqui; mover animaciones/temas enormes fuera de `index.css`.
- `.env` y `.env.example`: documentar todas las variables soportadas.
- `README.md`: hoy es insuficiente para onboarding; agregar arquitectura, convenciones y flujo de desarrollo.
- `index.html`: correcto; no requiere cambios estructurales.
- `postcss.config.js`: correcto.

### `src/`

- `src/main.tsx`: correcto; si crece, mover bootstrap a `app/providers`.
- `src/App.tsx`: correcto como composition root; mantenerlo delgado.
- `src/index.css`: principal deuda técnica visual. Partir en:
  - `styles/base.css`
  - `styles/motion.css`
  - `styles/themes/cyber.css`
  - `styles/themes/mission.css`
  - `styles/themes/forensic.css`
  - `styles/themes/matrix.css`
  Tambien conviene mover clases de componentes a sus primitives o a una capa `@layer components` más acotada.

### Contexts

- `src/contexts/AuthContext.tsx`: demasiadas responsabilidades juntas: token storage, refresh, redirect, profile bootstrap y provisioning de API. Separar en:
  - `auth-storage.ts`
  - `auth-session.ts`
  - `useAuthSession.ts`
  - `AuthProvider.tsx`
  Tambien conviene exponer `login/logout/register` desde un servicio y no desde el mismo provider.
- `src/contexts/ThemeContext.tsx`: simple y sano; si el sistema de temas sigue creciendo, mover persistencia y DOM sync a `theme-store.ts`.
- `src/contexts/themeOptions.ts`: correcto, pero ya es domain config; puede vivir en `shared/theme/themeOptions.ts`.

### Lib / Services

- `src/lib/api.ts`: archivo mas importante a refactorizar. Problemas:
  - mezcla auth, projects, endpoints, roles, analysis y test runs.
  - repite logica de headers, retries, blobs, uploads y envelope parsing.
  - no acepta `AbortSignal`.
  - normaliza respuestas de forma inconsistente.
  - mezcla concerns de HTTP client con endpoint-specific quirks.
  Recomendacion:
  - `services/http/client.ts`
  - `services/http/errors.ts`
  - `services/http/envelope.ts`
  - `services/api/auth.api.ts`
  - `services/api/projects.api.ts`
  - `services/api/endpoints.api.ts`
  - `services/api/testRuns.api.ts`
  - `services/api/analysis.api.ts`
- `src/lib/endpointTree.ts`: buena utilidad; mejorar rendimiento con memo/selectors si el arbol crece. Extraer comparadores y traversal helpers en archivos separados.
- `src/lib/testRuns.ts`: correcto, pero podria absorber mas formatting helpers de test runs y sacar constante de badge a `shared/constants/status.ts`.
- `src/lib/cn.ts`: correcto.

### Tipos

- `src/types/api.ts`: muy grande y transversal. Partir por feature:
  - `types/auth.ts`
  - `types/projects.ts`
  - `types/endpoints.ts`
  - `types/roles.ts`
  - `types/test-runs.ts`
  - `types/analysis.ts`
  Tambien conviene definir tipos UI separados cuando el backend no coincide 1:1 con la vista.

### Hooks / Stores / Utils

- `src/hooks/useAnalysisPolling.ts`: mover a `features/analysis/hooks/useAnalysisSocket.ts`; permitir reconnect strategy, teardown robusto y opcion de polling fallback.
- `src/stores/endpointSelectionStore.ts`: store correcto; mejorarlo con selectors exportados y acciones puras reutilizables. Si se mantiene Zustand, crear folder `stores/endpoint-selection/`.
- `src/utils/report-utils.ts`: correcto pero deberia dividirse en:
  - options/selectors
  - filtering
  - metrics aggregation
- `src/utils/preview-utils.ts`: correcto; puede quedarse si el feature sigue pequeno.

### Pages

- `src/pages/ProjectsPage.tsx`: mover fetch a `useProjectsQuery`; reemplazar `confirm/alert` por dialog/toast central.
- `src/pages/ProjectDetailPage.tsx`: correcto como contenedor, pero conviene loader/hook `useProjectDetail`.
- `src/pages/EndpointEditorPage.tsx`: aun mezcla fetch, save, test, role access y form state. Separar:
  - `useEndpointEditorState`
  - `useEndpointEditorData`
  - `useEndpointTestAction`
  - `useEndpointRoleAccess`
- `src/pages/TestRunPage.tsx`: aun es grande. Separar:
  - `useTestRunPolling`
  - `useTestRunResultsPage`
  - `useTestRunDownloads`
  - `useTestRunFiltersState`
  Tambien mover paginacion del URL local state al query string.
- `src/pages/AnalysisPage.tsx`: separar submit, polling y downloads en hooks del feature `analysis`.
- `src/pages/ReportPage.tsx`: separar share state, load y downloads. El ownership/share token deberia ser domain logic, no UI directa.
- `src/pages/LoginPage.tsx`: mover form schema y redirect logic a hooks/helpers.
- `src/pages/RegisterPage.tsx`: mover validacion de password a `auth/validators.ts`.
- `src/pages/ForgotPasswordPage.tsx`: unificar con las otras pantallas auth usando `AuthCardLayout`.
- `src/pages/ResetPasswordPage.tsx`: mismo criterio.
- `src/pages/NotFoundPage.tsx`: correcto.

### App Components

- `src/components/app/AppShell.tsx`: correcto; puede quedarse como shell pura.
- `src/components/app/AppRoutes.tsx`: migrar a route config lazy para code splitting.
- `src/components/app/AppBackground.tsx`: ya esta mejor; si sigue creciendo, mover preload/theme wallpaper logic a hook `useThemeBackgroundAssets`.
- `src/components/app/ThemePicker.tsx`: buena separacion; faltaria keyboard navigation mas robusta y posiblemente un store UI para popovers.
- `src/components/app/index.ts`: mantener solo como public API del submodulo.
- `src/components/NavHeader.tsx`: correcto, pero el nav config deberia vivir en `app/navigation.ts`.

### Components Generales

- `src/components/ProtectedRoute.tsx`: bueno para ahora; a futuro preferir loaders o route guards por config.
- `src/components/MatrixRain.tsx`: correcto; mantener aislado.
- `src/components/AnalysisDashboard.tsx`: separar tabla, filtros, paginacion y fetch. La tabla puede ser un `DataTable` reutilizable.
- `src/components/PreviewFileForm.tsx`: mover definicion del schema/serialization fuera del componente.
- `src/components/PreviewGetEndpointsPanel.tsx`: si sigue vivo, moverlo al feature `analysis`.
- `src/components/ProgressTracker.tsx`: correcto; podria recibir ya un `view model` y no DTO directo.
- `src/components/SecurityRuleSelector.tsx`: bueno como shared domain component; extraer constantes y labels a archivo dedicado.
- `src/components/ReportDownloads.tsx`: reemplazar botones crudos por `Button`; mover strings/formats a constants.
- `src/components/JsonReportView.tsx`: correcto como compositor; si crece mas, pasar filtros al URL.
- `src/components/JsonReportFilters.tsx`: usar UI primitives (`Input`, `Select`, `FormField`) y no html directo.

### UI

- `src/components/ui/Button.tsx`: correcto.
- `src/components/ui/buttonStyles.ts`: correcto; agregar compound states y loading state estandar.
- `src/components/ui/Modal.tsx`: correcto; faltan focus trap y return focus.
- `src/components/ui/TabBar.tsx`: correcto; agregar soporte iconos, disabled y aria attrs.
- `src/components/ui/MetricCard.tsx`: correcto.
- `src/components/ui/FormField.tsx`: usarlo mas; todavia hay forms con labels/input directos.
- `src/components/ui/Input.tsx`: añadir soporte `error`, `hint`, `prefix/suffix`.
- `src/components/ui/Textarea.tsx`: mismo criterio.
- `src/components/ui/Select.tsx`: mismo criterio.
- `src/components/ui/LinkButton.tsx`: correcto.
- `src/components/ui/EmptyState.tsx`: correcto.
- `src/components/ui/index.ts`: mantener como public API del design system.

### Projects Feature

- `src/components/projects/CreateProjectModal.tsx`: mover form state y validacion a `useProjectForm`.
- `src/components/projects/ProjectCard.tsx`: correcto; revisar si puede recibir callbacks memoizadas para evitar rerenders masivos.
- `src/components/projects/index.ts`: correcto.

### Project Auth

- `src/components/project-auth/authConfig.ts`: correcto; conviene agregar tests unitarios.
- `src/components/project-auth/ProjectAuthConfigFields.tsx`: grande para ser form partial; separar subformularios por auth type.
- `src/components/project-auth/index.ts`: correcto.

### Project Detail Feature

- `src/components/project-detail/EndpointsTab.tsx`: uno de los mayores candidatos a refactor. Separar:
  - `useProjectEndpoints`
  - `useEndpointImportActions`
  - `useEndpointTreeState`
  - `EndpointTree`
  - `EndpointTreeNode`
  - `EndpointsToolbar`
  - `EndpointsPagination`
- `src/components/project-detail/TestRunsTab.tsx`: mover fetch a hook y card a componente `TestRunListItem`.
- `src/components/project-detail/SettingsTab.tsx`: mover form a `ProjectSettingsForm`.
- `src/components/project-detail/RolesTab.tsx`: mover fetch a `useProjectRolesData`; separar layout de permisos.
- `src/components/project-detail/RolePermissionsPanel.tsx`: muy buena candidata a selector por mapas. Hoy usa `find/filter/includes` repetidos; pasar `permissions` a `Map<endpointId, permission>` y helpers puros.
- `src/components/project-detail/StartTestRunModal.tsx`: separar:
  - `TestCredentialList`
  - `EndpointScopeSelector`
  - `useStartTestRunForm`
  - `useProjectRoles`
- `src/components/project-detail/EndpointSelectorPanel.tsx`: mover fetch/selection a hook compartido con `EndpointsTab`.
- `src/components/project-detail/CrossRoleRulesMatrix.tsx`: mover transformaciones y guardado a selectors/actions puras.
- `src/components/project-detail/EndpointRoleAccessModal.tsx`: revisar si duplica la logica del editor.
- `src/components/project-detail/ProjectDetailHeader.tsx`: correcto.
- `src/components/project-detail/RoleFormModal.tsx`: mover schema y default values a helper.
- `src/components/project-detail/RoleList.tsx`: correcto.
- `src/components/project-detail/TestRunExecutionOptions.tsx`: correcto; puede absorber inputs comunes de numeric toggle.
- `src/components/project-detail/testRunForm.ts`: correcto; agregar tests.
- `src/components/project-detail/index.ts`: mantener solo exports publicos del feature.

### Endpoint Editor Feature

- `src/components/endpoint-editor/EndpointRequestPanel.tsx`: sigue muy cargado. Separar tabs internas:
  - `RequestParamsTab`
  - `RequestHeadersTab`
  - `RequestBodyTab`
  - `RequestAuthTab`
  - `RequestAccessTab`
  - `RequestSecurityTab`
- `src/components/endpoint-editor/EndpointResponsePanel.tsx`: correcto; si crece, separar body/headers/meta.
- `src/components/endpoint-editor/EndpointEditorToolbar.tsx`: correcto.
- `src/components/endpoint-editor/KeyValueTable.tsx`: hacerlo realmente reusable y moverlo a `shared/ui/data-entry`.
- `src/components/endpoint-editor/utils.ts`: agregar tests; mover regex/path parsing a helpers mas especificos.
- `src/components/endpoint-editor/constants.ts`: correcto.
- `src/components/endpoint-editor/types.ts`: correcto; podria vivir junto a `useEndpointEditorState`.
- `src/components/endpoint-editor/index.ts`: correcto.

### Test Run Feature

- `src/components/test-run/filtering.ts`: potente pero demasiado grande. Separar en:
  - `testRunFilter.types.ts`
  - `testRunFilter.apply.ts`
  - `testRunFilter.options.ts`
  - `testRunFilter.summary.ts`
  - `testRunFilter.sort.ts`
- `src/components/test-run/TestRunFilters.tsx`: usar configuracion declarativa en vez de 11 labels hardcoded.
- `src/components/test-run/EndpointResultCard.tsx`: correcto; si crece mas, delegar header/body a subcomponentes.
- `src/components/test-run/EndpointResultOverview.tsx`: correcto.
- `src/components/test-run/EndpointHttpResultList.tsx`: correcto.
- `src/components/test-run/HttpExecutionCard.tsx`: correcto; agregar componentes `StatChip` o `KeyValueMeta`.
- `src/components/test-run/HttpHeadersList.tsx`: correcto.
- `src/components/test-run/HttpDataPreview.tsx`: correcto.
- `src/components/test-run/httpResultUtils.ts`: bueno; agregar tests unitarios.
- `src/components/test-run/SecurityCheckItem.tsx`: revisar si puede normalizar `evidence`, `references`, `steps` antes de render.
- `src/components/test-run/TestRunSummaryGrid.tsx`: correcto.
- `src/components/test-run/TestRunAiAnalysis.tsx`: correcto.
- `src/components/test-run/ExecutiveReportSection.tsx`: separar `FindingGroupCard`; hoy ya lo insinua dentro del mismo archivo.
- `src/components/test-run/ScoreCircle.tsx`: correcto.
- `src/components/test-run/constants.ts`: correcto.
- `src/components/test-run/index.ts`: correcto como public API del feature.

### Report Feature

- `src/components/report/JsonReportEndpointResults.tsx`: mover fila y tabla a componentes mas pequeños; se beneficiaria de virtualization si hay muchos checks.
- `src/components/report/JsonReportAiSummary.tsx`: correcto.
- `src/components/report/utils.ts`: demasiado pequeno para justificar archivo aislado; o crece o se integra.
- `src/components/report/constants.ts`: correcto.
- `src/components/report/index.ts`: correcto.

### Analysis Feature

- `src/components/analysis/AnalysisHero.tsx`: correcto.
- `src/components/analysis/AnalysisPreviewSection.tsx`: revisar si hay logica derivada que deba vivir en selector.
- `src/components/analysis/AnalysisResultsSection.tsx`: correcto, pero un `ResultDownloadsPanel` reusable ayudaría.
- `src/components/analysis/index.ts`: correcto.

### Assets

- `src/assets/themes/mission-sequoia-dark.svg`: correcto; mantener como asset de tema.
- `src/assets/themes/mission-sequoia-light.svg`: correcto; mismo criterio.

## Helpers / Hooks / Stores Que Conviene Crear

- `src/shared/hooks/useDebouncedValue.ts`
- `src/shared/hooks/usePaginationState.ts`
- `src/shared/hooks/useAsyncAction.ts`
- `src/shared/utils/download.ts`
- `src/shared/utils/format-date.ts`
- `src/shared/utils/format-number.ts`
- `src/shared/utils/build-query-string.ts`
- `src/shared/utils/extract-error-message.ts`
- `src/state/ui/toast.store.ts`
- `src/state/ui/confirm.store.ts`
- `src/features/projects/hooks/useProjects.ts`
- `src/features/project-detail/hooks/useProjectDetail.ts`
- `src/features/endpoints/hooks/useProjectEndpoints.ts`
- `src/features/endpoints/hooks/useEndpointEditor.ts`
- `src/features/test-runs/hooks/useTestRun.ts`
- `src/features/test-runs/hooks/useTestRunFilters.ts`
- `src/features/analysis/hooks/useAnalysisRun.ts`
- `src/services/http/client.ts`
- `src/services/http/request.ts`
- `src/services/http/refresh-token.ts`

## Quick Wins De Alto Impacto

- Reemplazar `alert` y `confirm` por un sistema centralizado.
- Extraer `download blob` a un helper comun.
- Añadir `AbortController` en páginas y modales con fetch.
- Mover `search + debounce + page reset` a un hook reutilizable.
- Partir `api.ts`, `types/api.ts`, `filtering.ts` e `index.css`.
- Añadir tests a:
  - `endpointTree.ts`
  - `authConfig.ts`
  - `testRunForm.ts`
  - `httpResultUtils.ts`
  - `report-utils.ts`
  - `filtering.ts`

## Roadmap Sugerido

### Fase 1

- Partir `api.ts`, `types/api.ts`, `index.css`.
- Crear `useProjects`, `useProject`, `useEndpoints`, `useTestRun`.
- Crear `download.ts`, `error.ts`, `query.ts`, `date.ts`.

### Fase 2

- Refactorizar `EndpointsTab`, `TestRunPage`, `EndpointEditorPage`, `RolePermissionsPanel`.
- Introducir `toast` y `confirm dialog`.
- Llevar filtros y paginaciones importantes al URL.

### Fase 3

- Migrar a server-state library.
- Lazy load por ruta/feature.
- Añadir test suite y CI.
