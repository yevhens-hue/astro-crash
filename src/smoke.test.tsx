import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple component for testing
const SmokeTest = () => <div>Smoke Test Passed</div>;

describe('Vitest Setup', () => {
  it('should pass a simple math test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render a react component', () => {
    render(<SmokeTest />);
    expect(screen.getByText('Smoke Test Passed')).toBeInTheDocument();
  });
});
