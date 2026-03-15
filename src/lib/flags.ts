// Feature flags for development and testing
export const FEATURE_FLAGS = {
    DEBUG_MODE: false, // Set to true to bypass TON Connect requirements for testing
    GUEST_MODE: false, // Allow playing without a wallet
    HOUSE_WALLET: process.env.NEXT_PUBLIC_HOUSE_WALLET || 'UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA', // Server wallet for deposits - use env var in prod
    WELCOME_BONUS: 5.0, // Amount in TON for new users
    TEST_MOCK_WALLET: "EQAz-fG...mock_address"
};
