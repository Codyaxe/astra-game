import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConstellationLayer from '../components/starlink/ConstellationLayer';
import { PLACEHOLDER_STARS, PLACEHOLDER_CONNECTIONS } from '../mock/placeholders';

describe('ConstellationLayer Component Unit Tests', () => {
  it('renders all star labels from placeholders', () => {
    render(
      <ConstellationLayer
        stars={PLACEHOLDER_STARS}
        connectedSegments={PLACEHOLDER_CONNECTIONS}
      />
    );

    expect(screen.getByText(/Alpha \(Head\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Beta/i)).toBeInTheDocument();
    expect(screen.getByText(/Gamma/i)).toBeInTheDocument();
    expect(screen.getByText(/Delta/i)).toBeInTheDocument();
    expect(screen.getByText(/Epsilon/i)).toBeInTheDocument();
  });
});
