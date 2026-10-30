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
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ConfirmEmailChangePage } from '@/features/auth/ConfirmEmailChangePage';
import { OAuthCallbackPage } from '@/features/auth/OAuthCallbackPage';
import { bootstrapSession } from '@/features/auth/session';
import { PlansPage } from '@/features/billing/PlansPage';
import { CharactersPage } from '@/features/characters/CharactersPage';
import { ExportsPage } from '@/features/exports/ExportsPage';
import { DiagramsPage } from '@/features/diagrams/DiagramsPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { SearchPage } from '@/features/search/SearchPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StructurePage } from '@/features/structure/StructurePage';
import { TimelinePage } from '@/features/timeline/TimelinePage';
import { WorldsPage } from '@/features/worlds/WorldsPage';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { ProjectLayout } from './ProjectLayout';
import { SplashScreen } from './SplashScreen';

function RootComponent() {
  // Public pages render immediately; auth and protected routes bootstrap the
  // session in their own beforeLoad. This keeps the OAuth callback independent
  // from a refresh request that may still be in flight.
  return <Outlet />;
}

const rootRoute = createRootRoute({
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

const oauthCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: OAuthCallbackPage,
});

const legalOfferRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/offer',
  component: lazyRouteComponent(() => import('@/features/legal/OfferPage'), 'OfferPage'),
});

const legalTermsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/terms',
  component: lazyRouteComponent(() => import('@/features/legal/TermsPage'), 'TermsPage'),
});

const legalPrivacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/privacy',
  component: lazyRouteComponent(() => import('@/features/legal/PrivacyPage'), 'PrivacyPage'),
});

const legalCookiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal/cookies',
  component: lazyRouteComponent(() => import('@/features/legal/CookiesPage'), 'CookiesPage'),
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string; redirect?: string } => {
    const token = typeof search.token === 'string' ? search.token : undefined;
    const redirect =
      typeof search.redirect === 'string' ? search.redirect : undefined;
    return {
      ...(token ? { token } : {}),
      ...(redirect ? { redirect } : {}),
    };
  },
  component: VerifyEmailPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  beforeLoad: async () => {
    const session = await bootstrapSession();
    if (session.status === 'authenticated') {
      throw redirect({ to: '/settings' });
    }
  },
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    ...(typeof search.token === 'string' ? { token: search.token } : {}),
  }),
  component: ResetPasswordPage,
});

const confirmEmailChangeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirm-email-change',
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    ...(typeof search.token === 'string' ? { token: search.token } : {}),
  }),
  component: ConfirmEmailChangePage,
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
  beforeLoad: async () => {
    await bootstrapSession();
  },
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

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: SettingsPage,
});

const plansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans',
  beforeLoad: requireAuth,
  component: PlansPage,
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

const galleryRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'gallery',
  component: lazyRouteComponent(
    () => import('@/features/gallery/GalleryPage'),
    'GalleryPage',
  ),
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
  oauthCallbackRoute,
  legalOfferRoute,
  legalTermsRoute,
  legalPrivacyRoute,
  legalCookiesRoute,
  verifyEmailRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  confirmEmailChangeRoute,
  shareRoute,
  sharedDocumentRoute,
  projectsRoute,
  settingsRoute,
  plansRoute,
  projectRoute.addChildren([
    structureRoute,
    charactersRoute,
    characterRoute,
    worldsRoute,
    worldRoute,
    galleryRoute,
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
