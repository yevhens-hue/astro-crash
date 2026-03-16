import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Countries where online gambling is legally restricted
// Based on major regulatory frameworks (as of 2026)
const BLOCKED_COUNTRIES = new Set([
  'US', // United States
  'GB', // United Kingdom (strict UKGC licensing required)
  'FR', // France
  'NL', // Netherlands
  'ES', // Spain
  'SG', // Singapore
  'AU', // Australia (specific state laws)
  'HU', // Hungary
  'CZ', // Czechia
  'PL', // Poland
  'RO', // Romania
  'LT', // Lithuania (updated 2024)
  'PT', // Portugal (licensed operators only)
  'ZA', // South Africa
  'PH', // Philippines (PAGCOR licensed only)
  'KR', // South Korea
  'CN', // China
  'IN', // India (most states)
  'AF', // Afghanistan
  'PK', // Pakistan
  'IR', // Iran
  'IQ', // Iraq
  'KP', // North Korea
]);

// Paths that are always accessible (legal pages)
const ALLOWED_PATHS = ['/terms', '/privacy', '/blocked'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow legal and static pages
  if (
    ALLOWED_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')  // static files
  ) {
    return NextResponse.next();
  }

  // Get visitor's country from Vercel's geo header (automatically set by Vercel Edge Network)
  const country = request.headers.get('x-vercel-ip-country') ?? null;

  if (country && BLOCKED_COUNTRIES.has(country)) {
    const blockedUrl = new URL('/blocked', request.url);
    blockedUrl.searchParams.set('country', country);
    return NextResponse.redirect(blockedUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
