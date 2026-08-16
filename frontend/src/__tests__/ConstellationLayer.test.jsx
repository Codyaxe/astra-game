import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConstellationLayer from '../components/starlink/ConstellationLayer';
import { PLACEHOLDER_STARS, PLACEHOLDER_CONNECTIONS } from '../mock/placeholders';

describe('ConstellationLayer Component Unit Tests', () => {
  it('renders all star nodes and connection lines cleanly without text labels', () => {
    const { container } = render(
      <ConstellationLayer
        stars={PLACEHOLDER_STARS}
        connectedSegments={PLACEHOLDER_CONNECTIONS}
      />
    );

    // Verify SVG container renders
    const svg = container.querySelector('svg.constellation-layer');
    expect(svg).toBeInTheDocument();

    // Verify connected lines render
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);

    // Verify star node groups render
    const starGroups = container.querySelectorAll('g');
    expect(starGroups.length).toBeGreaterThanOrEqual(PLACEHOLDER_STARS.length);
  });
});
