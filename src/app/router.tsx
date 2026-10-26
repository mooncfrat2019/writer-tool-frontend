import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { bootstrapSession, useSession } from '@/features/auth/session';
import { CharactersPage } from '@/features/characters/CharactersPage';
import { ExportsPage } from '@/features/exports/ExportsPage';
import { DiagramsPage } from '@/features/diagrams/DiagramsPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { SearchPage } from '@/features/search/SearchPage';
import { StructurePage } from '@/features/structure/StructurePage';
import { TimelinePage } from '@/features/timeline/TimelinePage';
import { WorldsPage } from '@/features/worlds/WorldsPage';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { ProjectLayout } from './ProjectLayout';
import { SplashScreen } from './SplashScreen';

function RootComponent() {
  const session = useSession();
  if (session.status === 'initializing') {
    return <SplashScreen />;
  }
  return <Outlet />;
}

const rootRoute = createRootRoute({
  beforeLoad: async () => {
    await bootstrapSession();
  },
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const session = await bootstrapSession();
    throw redirect({ to: session.status === 'authenticated' ? '/projects' : '/login' });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const session = await bootstrapSession();
    if (session.status === 'authenticated') {
      throw redirect({ to: '/projects' });
    }
  },
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: async () => {
    const session = await bootstrapSession();
    if (session.status === 'authenticated') {
      throw redirect({ to: '/projects' });
    }
  },
  component: RegisterPage,
});

async function requireAuth() {
  const session = await bootstrapSession();
  if (session.status !== 'authenticated') {
    throw redirect({ to: '/login' });
  }
}

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$token',
  component: lazyRouteComponent(
    () => import('@/features/sharing/SharePage'),
    'SharePage',
  ),
});

const sharedDocumentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shared/documents/$documentId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import('@/features/sharing/SharedDocumentPage'),
    'SharedDocumentPage',
  ),
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  beforeLoad: requireAuth,
  component: ProjectsPage,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  beforeLoad: requireAuth,
  component: ProjectLayout,
});

const structureRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'structure',
  validateSearch: (
    search: Record<string, unknown>,
  ): { bookId?: string } => {
    const bookId = typeof search.bookId === 'string' ? search.bookId : undefined;
    return bookId ? { bookId } : {};
  },
  component: StructurePage,
});

const charactersRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'characters',
  component: CharactersPage,
});

const characterRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'characters/$characterId',
  component: lazyRouteComponent(
    () => import('@/features/characters/CharacterDetailPage'),
    'CharacterDetailPage',
  ),
});

const exportsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'exports',
  component: ExportsPage,
});

const worldsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'worlds',
  component: WorldsPage,
});

const worldRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'worlds/$worldId',
  component: lazyRouteComponent(
    () => import('@/features/worlds/WorldDetailPage'),
    'WorldDetailPage',
  ),
});

const searchRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'search',
  component: SearchPage,
});

const timelineRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'timeline',
  component: TimelinePage,
});

const diagramsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'diagrams',
  component: DiagramsPage,
});

const diagramRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'diagrams/$diagramId',
  component: lazyRouteComponent(
    () => import('@/features/diagrams/DiagramEditorPage'),
    'DiagramEditorPage',
  ),
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/write/$nodeId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import('@/features/editor/EditorPage'),
    'EditorPage',
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  shareRoute,
  sharedDocumentRoute,
  projectsRoute,
  projectRoute.addChildren([
    structureRoute,
    charactersRoute,
    characterRoute,
    worldsRoute,
    worldRoute,
    timelineRoute,
    diagramsRoute,
    diagramRoute,
    searchRoute,
    exportsRoute,
  ]),
  editorRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultPendingComponent: SplashScreen,
  defaultPendingMs: 200,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
