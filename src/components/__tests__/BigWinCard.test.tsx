import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BigWinCard from '../BigWinCard';

describe('BigWinCard Component', () => {
    const defaultProps = {
        multiplier: 50.45,
        amount: 5.25,
        onClose: vi.fn(),
        onShare: vi.fn(),
    };

    it('renders the multiplier and amount correctly', () => {
        render(<BigWinCard {...defaultProps} />);
        
        expect(screen.getByText(/x50.45/i)).toBeInTheDocument();
        expect(screen.getByText(/5.25 TON/i)).toBeInTheDocument();
    });

    it('calls onClose when clicking the close button', () => {
        render(<BigWinCard {...defaultProps} />);
        
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
        
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onShare when clicking the share button', () => {
        render(<BigWinCard {...defaultProps} />);
        
        const shareButton = screen.getByText(/share/i);
        fireEvent.click(shareButton);
        
        expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });
});
