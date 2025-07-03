import React from 'react';
import { render, screen } from '@testing-library/react';
import CompassIcon from './CompassIcon';

describe('CompassIcon', () => {
  it('renders null when heading is null', () => {
    const { container } = render(<CompassIcon heading={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when heading is NaN', () => {
    const { container } = render(<CompassIcon heading={NaN} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the compass with correct rotation and text when heading is provided', () => {
    const heading = 90;
    render(<CompassIcon heading={heading} />);

    const compassContainer = screen.getByTestId('compass-container');
    const compassSpan = compassContainer.querySelector('span');
    expect(compassSpan).toBeInTheDocument();
    expect(compassSpan).toHaveStyle(`transform: rotate(${heading}deg)`);

    const headingText = screen.getByText(`${Math.round(heading)}°`);
    expect(headingText).toBeInTheDocument();
  });

  it('renders the compass with 0 degree rotation and text', () => {
    const heading = 0;
    render(<CompassIcon heading={heading} />);

    const compassContainer = screen.getByTestId('compass-container');
    const compassSpan = compassContainer.querySelector('span');
    expect(compassSpan).toBeInTheDocument();
    expect(compassSpan).toHaveStyle(`transform: rotate(${heading}deg)`);

    const headingText = screen.getByText(`${Math.round(heading)}°`);
    expect(headingText).toBeInTheDocument();
  });

  it('renders the compass with 359 degree rotation and text', () => {
    const heading = 359;
    render(<CompassIcon heading={heading} />);

    const compassContainer = screen.getByTestId('compass-container');
    const compassSpan = compassContainer.querySelector('span');
    expect(compassSpan).toBeInTheDocument();
    expect(compassSpan).toHaveStyle(`transform: rotate(${heading}deg)`);

    const headingText = screen.getByText(`${Math.round(heading)}°`);
    expect(headingText).toBeInTheDocument();
  });
});
