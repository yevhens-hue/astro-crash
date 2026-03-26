// Feature flags for development and testing
// IMPORTANT: Never hardcode wallet addresses or sensitive data!
// All sensitive configuration must be set via environment variables

export const FEATURE_FLAGS = {
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true', // Set to true to bypass TON Connect requirements for testing
    GUEST_MODE: process.env.NEXT_PUBLIC_GUEST_MODE === 'true', // Allow playing without a wallet
    // House wallet MUST be set via NEXT_PUBLIC_HOUSE_WALLET env var
    // Fallback only in development to prevent breaking local dev
    HOUSE_WALLET: process.env.NEXT_PUBLIC_HOUSE_WALLET || 
        (process.env.NODE_ENV === 'development' ? 'UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA' : ''),
    WELCOME_BONUS: parseFloat(process.env.NEXT_PUBLIC_WELCOME_BONUS || '5.0'), // Amount in TON for new users
};

// Validation: Ensure critical configs are set in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_HOUSE_WALLET) {
        console.error('CRITICAL: NEXT_PUBLIC_HOUSE_WALLET is not set in production!');
    }
    // SECURITY: Disable guest mode in production
    if (FEATURE_FLAGS.GUEST_MODE) {
        console.error('SECURITY WARNING: GUEST_MODE is enabled in production! This should be disabled.');
        FEATURE_FLAGS.GUEST_MODE = false;
    }
}
