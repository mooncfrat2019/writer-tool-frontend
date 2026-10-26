import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { CharactersPage } from '@/routes/CharactersPage';
import { EditorPage } from '@/routes/EditorPage';
import { ExportsPage } from '@/routes/ExportsPage';
import { LoginPage } from '@/routes/LoginPage';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { ProjectsPage } from '@/routes/ProjectsPage';
import { RegisterPage } from '@/routes/RegisterPage';
import { StructurePage } from '@/routes/StructurePage';
import { ProjectLayout } from './ProjectLayout';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/projects' });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsPage,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectLayout,
});

const structureRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'structure',
  component: StructurePage,
});

const editorRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'write/$nodeId',
  component: EditorPage,
});

const charactersRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'characters',
  component: CharactersPage,
});

const exportsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'exports',
  component: ExportsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  projectsRoute,
  projectRoute.addChildren([structureRoute, editorRoute, charactersRoute, exportsRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
