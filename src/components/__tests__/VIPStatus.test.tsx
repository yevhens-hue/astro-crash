import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VIPStatus from '../VIPStatus';

describe('VIPStatus Component', () => {
  const mockProps = {
    level: 3,
    levelName: 'Silver Nova',
    currentPoints: 2500,
    nextLevelPoints: 5000,
    perks: ['Cashback 5%', 'Free Daily Spins', 'Priority Support']
  };

  it('renders the current VIP level and name correctly', () => {
    render(<VIPStatus {...mockProps} />);
    expect(screen.getByText(/Level 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Silver Nova/i)).toBeInTheDocument();
  });

  it('renders the progress bar with correct points', () => {
    render(<VIPStatus {...mockProps} />);
    expect(screen.getByText(/2500/i)).toBeInTheDocument();
    expect(screen.getByText(/\/ 5000 XP/i)).toBeInTheDocument();
  });

  it('renders all VIP perks', () => {
    render(<VIPStatus {...mockProps} />);
    mockProps.perks.forEach(perk => {
      expect(screen.getByText(perk)).toBeInTheDocument();
    });
  });
});
