import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
  
  // Replay settings
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Filter out common non-critical errors
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Ignore network errors that are handled gracefully
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return null;
    }
    
    // Ignore expected game state errors
    if (error instanceof Error && error.message.includes('Game state error')) {
      return null;
    }
    
    return event;
  },
  
  // Environment tags
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
});
