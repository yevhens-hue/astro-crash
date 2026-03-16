import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders cashback badge and details when pendingCashback > 0', () => {
    render(
      <VIPStatus 
        {...mockProps} 
        pendingCashback={12.5} 
        cashbackRate={10} 
        netLoss={125}
      />
    );
    // Badge
    expect(screen.getByText('+12.50 TON')).toBeInTheDocument();
    // Info Bar
    expect(screen.getByText(/Weekly Cashback: 10% of net losses/i)).toBeInTheDocument();
    expect(screen.getByText(/Net loss: 125.00 TON/i)).toBeInTheDocument();
  });

  it('renders calculation details when expanded', () => {
    render(
      <VIPStatus 
        {...mockProps} 
        pendingCashback={12.5} 
        netLoss={125}
        calculation={{
          totalBets: 500,
          totalWins: 375,
          formula: '500 - 375 = 125',
          cashbackFormula: '125 × 10% = 12.5',
          minimumQualifier: 'You qualify for cashback!'
        }}
      />
    );
    
    // Default closed state - calculation details not visible
    expect(screen.queryByText(/Cashback Calculation/i)).not.toBeInTheDocument();
    
    // Open cashback details
    const infoBar = screen.getByRole('button', { name: /Weekly Cashback/i });
    fireEvent.click(infoBar);
    
    expect(screen.getByText(/Cashback Calculation/i)).toBeInTheDocument();
    expect(screen.getByText(/500.00 TON/i)).toBeInTheDocument(); // totalBets
    expect(screen.getByText(/-375.00 TON/i)).toBeInTheDocument(); // totalWins
    // Net loss appears twice: once in the compact header, once in details.
    expect(screen.getAllByText(/125.00 TON/i).length).toBeGreaterThan(0); 
    expect(screen.getByText(/You qualify for cashback!/i)).toBeInTheDocument();
  });
});
