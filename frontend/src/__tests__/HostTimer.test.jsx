import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HostTimer from '../components/starlink/HostTimer';

describe('HostTimer Component Unit Tests', () => {
  it('calculates remaining seconds accurately from startTime and duration', () => {
    // 10 seconds elapsed out of 45 seconds total -> 35 seconds remaining
    const startTime = Date.now() - 10000;
    render(<HostTimer startTime={startTime} duration={45} />);

    expect(screen.getByText(/0:35/i)).toBeInTheDocument();
  });

  it('handles expired time gracefully without going below 0', () => {
    // 50 seconds elapsed out of 45 seconds total -> 0 seconds remaining
    const startTime = Date.now() - 50000;
    render(<HostTimer startTime={startTime} duration={45} />);

    expect(screen.getByText(/0:00/i)).toBeInTheDocument();
  });
});
