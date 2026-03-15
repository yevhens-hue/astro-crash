// Feature flags for development and testing
export const FEATURE_FLAGS = {
    DEBUG_MODE: false, // Set to true to bypass TON Connect requirements for testing
    GUEST_MODE: false, // Allow playing without a wallet
    HOUSE_WALLET: process.env.NEXT_PUBLIC_HOUSE_WALLET || '', // Server wallet for payouts
    WELCOME_BONUS: 5.0, // Amount in TON for new users
    TEST_MOCK_WALLET: "EQAz-fG...mock_address"
};
