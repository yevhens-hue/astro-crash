import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Page from './page';

// Mocking dependencies to avoid context/sdk errors during simple render test
vi.mock('@tonconnect/ui-react', () => ({
  useTonWallet: vi.fn(() => null),
  useTonConnectUI: vi.fn(() => [{}, vi.fn()]),
  TonConnectButton: () => <div data-testid="ton-button">TonButton</div>,
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
    })),
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
});
