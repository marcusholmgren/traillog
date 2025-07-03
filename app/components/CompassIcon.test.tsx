import React from 'react';
import { render, screen } from '@testing-library/react';
import CompassIcon from './CompassIcon';

describe('CompassIcon', () => {
  it('renders North when heading is null', () => {
    const { container } = render(<CompassIcon heading={null} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders North when heading is NaN', () => {
    const { container } = render(<CompassIcon heading={NaN} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the compass with correct rotation and text when heading is provided', () => {
    const heading = 90;
    render(<CompassIcon heading={heading} />);

    const compassContainer = screen.getByTestId('compass-container');
    const compassSpan = compassContainer.querySelector('svg');
    expect(compassSpan).toBeInTheDocument();
    expect(compassSpan).toHaveStyle(`transform: rotate(${heading}deg)`);
  });

  it('renders the compass with 0 degree rotation and text', () => {
    const heading = 0;
    render(<CompassIcon heading={heading} />);

    const compassContainer = screen.getByTestId('compass-container');
    const compassSpan = compassContainer.querySelector('svg');
    expect(compassSpan).toBeInTheDocument();
    expect(compassSpan).toHaveStyle(`transform: rotate(${heading}deg)`);
  });

  it('renders the compass with 359 degree rotation and text', () => {
    const heading = 359;
    render(<CompassIcon heading={heading} />);

    const compassContainer = screen.getByTestId('compass-container');
    const compassSvg = compassContainer.querySelector('svg');
    expect(compassSvg).toBeInTheDocument();
    expect(compassSvg).toHaveStyle(`transform: rotate(${heading}deg)`);
  });
});
