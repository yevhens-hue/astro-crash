/**
 * Logging utility for the application
 * Supports console logging in development and Sentry in production
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  walletAddress?: string;
  gameType?: 'crash' | 'slots' | 'roulette';
  betId?: string;
  roundId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(meta || {}).length > 0 
      ? ` ${JSON.stringify(meta)}` 
      : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, meta?: LogContext): void {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, { ...this.context, ...meta }));
    }
  }

  info(message: string, meta?: LogContext): void {
    if (isDevelopment) {
      console.info(this.formatMessage('info', message, { ...this.context, ...meta }));
    }
    
    // In production, you could send to analytics service
    if (isProduction) {
      // Optional: Send to analytics
    }
  }

  warn(message: string, meta?: LogContext): void {
    console.warn(this.formatMessage('warn', message, { ...this.context, ...meta }));
    
    // Could send warnings to Sentry in production
    if (isProduction && typeof window === 'undefined') {
      // Server-side warning tracking
    }
  }

  error(message: string, error?: Error, meta?: LogContext): void {
    const errorMeta = error 
      ? { ...this.context, ...meta, error: error.message, stack: error.stack } 
      : { ...this.context, ...meta };
    
    console.error(this.formatMessage('error', message, errorMeta));
  }

  // Game-specific logging helpers
  logBetPlaced(walletAddress: string, betId: string, amount: number, gameType: 'crash' | 'slots' | 'roulette'): void {
    this.info('Bet placed', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      betId: betId.substring(0, 8) + '...',
      amount,
      gameType,
    });
  }

  logBetWon(walletAddress: string, betId: string, winAmount: number, multiplier: number): void {
    this.info('Bet won', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      betId: betId.substring(0, 8) + '...',
      winAmount,
      multiplier,
    });
  }

  logBetLost(walletAddress: string, betId: string, amount: number): void {
    this.info('Bet lost', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      betId: betId.substring(0, 8) + '...',
      amount,
    });
  }

  logJackpotWin(walletAddress: string, amount: number, jackpotType: string): void {
    this.info('Jackpot won!', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      amount,
      jackpotType,
    });
  }

  logRateLimitExceeded(walletAddress: string, endpoint: string): void {
    this.warn('Rate limit exceeded', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      endpoint,
    });
  }

  logAuthFailure(walletAddress: string, reason: string): void {
    this.warn('Authentication failed', {
      walletAddress: walletAddress?.substring(0, 8) + '...',
      reason,
    });
  }

  logTransactionError(walletAddress: string, error: Error, txType: string): void {
    this.error(`Transaction error: ${txType}`, error, {
      walletAddress: walletAddress?.substring(0, 8) + '...',
      txType,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for use in different modules
export default logger;
