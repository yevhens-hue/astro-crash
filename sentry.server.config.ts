import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
  
  // Server-side only settings
  includeLocalVariables: true,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  
  // Ignore expected errors
  ignoreErrors: [
    'User declined transaction',
    'Insufficient funds',
    'Transaction timeout',
    /Network error/i,
  ],
});
