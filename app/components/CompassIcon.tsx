import React from 'react';

/**
 * Defines the props accepted by the CompassIcon component.
 */
interface CompassIconProps {
  /**
   * The direction the user is heading, in degrees (0-360).
   * 0 degrees represent North.
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

    // The compass icon is positioned absolutely at the bottom right of the screen.
  return (
    <div
        className="absolute bottom-[5px] right-[15px] z-[1000] bg-white/80 rounded-full p-[5px] shadow-md"
        title={`Heading: ${rotation}°`}
        data-testid="compass-container"
    >
      {/* You can replace this SVG with your own compass image or icon library component */}
      <svg
        className="transition-transform duration-300 ease-out w-12 h-12"
        style={{ transform: `rotate(${rotation}deg)` }}
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