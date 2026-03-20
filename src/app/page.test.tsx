import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Page from './page';

// Mocking dependencies to avoid context/sdk errors during simple render test
vi.mock('@tonconnect/ui-react', () => ({
  useTonWallet: vi.fn(() => ({ account: { address: '0xTestWallet' } })),
  useTonConnectUI: vi.fn(() => [{}, vi.fn()]),
  useTonAddress: vi.fn(() => 'UQTestWallet123'),
  TonConnectButton: () => <div data-testid="ton-button">TonButton</div>,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'dummy', balance: 0, bonus_balance: 5, wagering_requirement: 175 } }) }) }),
    })),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null }) }
  },
}));

// Mock child components to speed up test and avoid their side effects
vi.mock('@/components/CrashGame', () => ({
  default: () => <div data-testid="crash-game">CrashGame</div>,
}));
vi.mock('@/components/SlotMachine', () => ({
  default: () => <div data-testid="slot-machine">SlotMachine</div>,
}));
vi.mock('@/components/BurgerMenu', () => ({
  default: () => <div data-testid="burger-menu">BurgerMenu</div>,
}));

describe('Page Component Branding', () => {
  it('should NOT render the Game Selector block (Astro Crash / Galaxy Slots buttons)', () => {
    render(<Page />);

    // According to TDD: This test MUST FAIL first because the block is still in the code
    const crashSelector = screen.queryByText(/Astro Crash/i);
    expect(crashSelector).not.toBeInTheDocument();
  });

  it('renders WelcomeBonusModal correctly on first load with 5 TON', async () => {

    render(<Page />);

    // Ensure the welcome modal shows up with the expected 5 TON mock translation test
    const welcomeTitle = await screen.findByText('welcome_title');
    expect(welcomeTitle).toBeInTheDocument();

    // Check that we render the let's play button
    const playButton = await screen.findByRole('button', { name: /lets_play/i });
    expect(playButton).toBeInTheDocument();
  });
});
