import React from 'react';

/**
 * Defines the props accepted by the CompassIcon component.
 */
interface CompassIconProps {
  /**
   * The direction the user is heading, in degrees (0-360).
   * 0 degrees represents North.
   * If the heading is null (e.g., the user is not moving), the compass will default to North.
   */
  heading: number | null;
}

/**
 * A simple compass icon component that rotates to show the current direction of movement.
 */
function CompassIcon({ heading }: CompassIconProps) {
  // If heading is null, default to 0 (North). Otherwise, use the provided heading.
  const rotation = Math.round(heading ?? 0);

  const iconStyle: React.CSSProperties = {
    // The transform property rotates the icon. We add a smooth transition for a better user experience.
    transform: `rotate(${rotation}deg)`,
    transition: 'transform 0.3s ease-out',
    width: '48px', // Adjust size as needed
    height: '48px',
  };

  const containerStyle: React.CSSProperties = {
    // This positions the compass on the map. Assumes a parent with relative positioning.
    position: 'absolute',
    bottom: '115px',
    right: '15px',
    zIndex: 1000, // Ensure it's on top of map layers
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '50%',
    padding: '5px',
    boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
  };

  return (
    <div
        style={containerStyle}
        title={`Heading: ${rotation}°`}
        data-testid="compass-container"
    >
      {/* You can replace this SVG with your own compass image or icon library component */}
      <svg
        style={iconStyle}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        strokeWidth="1.5"
      >
        <path
          d="M12 2L8 22l4-9 4 9L12 2z"
          fill="#E53935" // Red part of the needle (points North)
          stroke="#B71C1C"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 2L16 22l-4-9-4 9L12 2z"
          fill="#EEEEEE" // Grey part of the needle
          stroke="#BDBDBD"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="rotate(180 12 12)"
        />
      </svg>
    </div>
  );
};

export default CompassIcon;