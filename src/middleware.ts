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
  // 'IN', // India - handled separately by state level below
  'AF', // Afghanistan
  'PK', // Pakistan
  'IR', // Iran
  'IQ', // Iraq
  'KP', // North Korea
]);

// Indian states where online gambling is STRICTLY PROHIBITED
// Based on current Indian state laws (Public Gambling Act 1867 & local amendments)
const BLOCKED_INDIAN_STATES = new Set([
  'AP', // Andhra Pradesh
  'AS', // Assam
  'OR', // Odisha
  'TG', // Telangana
  'TN', // Tamil Nadu
  'NL', // Nagaland (requires specific local license)
  'SK', // Sikkim (requires specific local license)
  'KA', // Karnataka (recently restricted)
  'CT', // Chhattisgarh
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

  // Get visitor's country and region from Vercel's geo headers
  const country = request.headers.get('x-vercel-ip-country') ?? null;
  const region = request.headers.get('x-vercel-ip-country-region') ?? null;

  let isBlocked = false;

  if (country && BLOCKED_COUNTRIES.has(country)) {
    isBlocked = true;
  } else if (country === 'IN' && region && BLOCKED_INDIAN_STATES.has(region.toUpperCase())) {
    // Specifically block restricted Indian states
    isBlocked = true;
  }

  if (isBlocked) {
    const blockedUrl = new URL('/blocked', request.url);
    if (country) blockedUrl.searchParams.set('country', country);
    if (region) blockedUrl.searchParams.set('region', region);
    return NextResponse.redirect(blockedUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
