import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScoreOverlay from '../components/starlink/ScoreOverlay';

describe('ScoreOverlay Component Unit Tests', () => {
  it('renders Win branch score box with correct title and score', () => {
    render(<ScoreOverlay isWin={true} score={98} />);

    expect(screen.getByText(/Navigation Complete/i)).toBeInTheDocument();
    expect(screen.getByText(/SCORE: 98/i)).toBeInTheDocument();
    expect(
      screen.getByText(/congratulations, you are now/i)
    ).toBeInTheDocument();
  });

  it('renders Fail branch score box with correct fail styling and text', () => {
    render(<ScoreOverlay isWin={false} score={42} />);

    expect(screen.getByText(/Mission Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/SCORE: 42/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Navigation disrupted. Spacecraft impact recorded./i)
    ).toBeInTheDocument();
  });

  it('triggers onRestart callback when Return button is clicked', () => {
    const handleRestart = vi.fn();
    render(<ScoreOverlay isWin={true} score={85} onRestart={handleRestart} />);

    const button = screen.getByRole('button', { name: /RETURN TO BASE/i });
    fireEvent.click(button);

    expect(handleRestart).toHaveBeenCalledTimes(1);
  });
});
