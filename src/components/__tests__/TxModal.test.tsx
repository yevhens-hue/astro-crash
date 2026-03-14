import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TxModal from '../TxModal';

// Mock Lucide icons to avoid SVGs cluttering tests
vi.mock('lucide-react', () => ({
  ArrowDownLeft: () => null,
  ArrowUpRight: () => null,
  X: () => null,
  Loader2: () => null,
}));

describe('TxModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props: any) => {
    return render(
      <TxModal
        type="withdraw"
        balance={10}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        defaultAddress=""
        {...props}
      />
    );
  };

  it('renders correctly for withdrawal', () => {
    renderModal({});
    expect(screen.getByText('Withdraw TON')).toBeInTheDocument();
    expect(screen.getByText(/Available: 10.00 TON/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('UQ...')).toBeInTheDocument();
  });

  it('validates minimum withdrawal amount (0.5 TON)', async () => {
    renderModal({});
    
    // Set amount below minimum
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '0.2' } });
    
    // Set valid address
    const addressInput = screen.getByPlaceholderText('UQ...');
    fireEvent.change(addressInput, { target: { value: 'UQTest123' } });
    
    const confirmButton = screen.getByRole('button', { name: /withdraw/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Minimum 0.5 TON/i)).toBeInTheDocument();
    });
    
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with correct amount and recipient address', async () => {
    renderModal({});
    
    // Set valid amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '2.5' } });
    
    // Set a custom recipient address
    const customAddress = 'UQCustomRecipientAddress123';
    const addressInput = screen.getByPlaceholderText('UQ...');
    fireEvent.change(addressInput, { target: { value: customAddress } });
    
    const confirmButton = screen.getByRole('button', { name: /withdraw/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith(2.5, customAddress);
    });
    
    // onClose should be called after a successful confirm
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('validates insufficient balance', async () => {
    renderModal({ balance: 2 });
    
    // Set amount greater than balance
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '5' } });
    
    const addressInput = screen.getByPlaceholderText('UQ...');
    fireEvent.change(addressInput, { target: { value: 'UQTest123' } });
    
    const confirmButton = screen.getByRole('button', { name: /withdraw/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
    });
  });
});
