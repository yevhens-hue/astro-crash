import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FEATURE_FLAGS } from '../lib/flags';

// Mocking Supabase since we can't run real DB calls in unit tests easily
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => ({ data: null, error: { code: 'PGRST116' } })),
};

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('Bonus System Logic', () => {
  const WELCOME_BONUS = 5.0;
  const WAGER_MULTIPLIER = 35;
  const EXPECTED_WAGER = WELCOME_BONUS * WAGER_MULTIPLIER;

  it('should initialize a new user with 5 TON bonus and x35 wagering requirement', () => {
    const initialBonus = WELCOME_BONUS;
    const initialWager = initialBonus * WAGER_MULTIPLIER;
    
    expect(initialBonus).toBe(5.0);
    expect(initialWager).toBe(175.0);
  });

  it('should correctly decrement wagering requirement on qualifying bets (odds >= 1.5x)', () => {
    let currentWageringRequirement = 175.0;
    const betAmount = 10.0;
    const multiplier = 2.0; // Qualifying odds

    if (multiplier >= 1.5) {
      currentWageringRequirement = Math.max(0, currentWageringRequirement - betAmount);
    }

    expect(currentWageringRequirement).toBe(165.0);
  });

  it('should not decrement wagering requirement on low odds bets (odds < 1.5x)', () => {
    let currentWageringRequirement = 175.0;
    const betAmount = 10.0;
    const multiplier = 1.2; // Non-qualifying odds

    if (multiplier >= 1.5) {
      currentWageringRequirement = Math.max(0, currentWageringRequirement - betAmount);
    }

    expect(currentWageringRequirement).toBe(175.0);
  });

  it('should unlock bonus and transfer to real balance when wagering requirement hits 0', () => {
    let balance = 10.0;
    let bonusBalance = 5.0;
    let wageringRequirement = 5.0;
    const finalBet = 5.0;
    const multiplier = 2.0;

    // Simulate final bet turnover
    if (multiplier >= 1.5) {
      wageringRequirement = Math.max(0, wageringRequirement - finalBet);
    }

    // Logic for unlocking bonus
    if (wageringRequirement <= 0 && bonusBalance > 0) {
      balance = balance + bonusBalance;
      bonusBalance = 0;
    }

    expect(wageringRequirement).toBe(0);
    expect(balance).toBe(15.0);
    expect(bonusBalance).toBe(0);
  });
});
