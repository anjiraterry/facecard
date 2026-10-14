import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/home',
  '/card',
  '/scan',
  '/faceoff',
  '/arena',
  '/leaderboard',
  '/profile',
  '/friends',
  '/shop',
  '/points',
  '/onboarding',
];

// Routes only for unauthenticated users (redirect away if logged in)
const AUTH_ONLY_ROUTES = ['/sign-in', '/verify', '/start'];

function isAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('fc_session');
  const userIdCookie = request.cookies.get('fc_user_id');
  return !!(sessionCookie?.value || userIdCookie?.value);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals, API routes, and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  const authenticated = isAuthenticated(request);

  // Root route: redirect to /home if logged in, else serve landing page
  if (pathname === '/') {
    if (authenticated) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Auth-only routes: redirect authenticated users to /home
  if (AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    if (authenticated) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: require authentication
  if (PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    if (!authenticated) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Sliding session window: refresh cookie expiry on every protected page visit
    const response = NextResponse.next();
    const currentSession = request.cookies.get('fc_session')?.value;
    const currentUserId = request.cookies.get('fc_user_id')?.value;
    const isProduction = process.env.NODE_ENV === 'production';
    const THIRTY_DAYS = 60 * 60 * 24 * 30;

    if (currentSession) {
      response.cookies.set('fc_session', currentSession, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: THIRTY_DAYS,
      });
    }
    if (currentUserId) {
      response.cookies.set('fc_user_id', currentUserId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: THIRTY_DAYS,
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

export default proxy;
