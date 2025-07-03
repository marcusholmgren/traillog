import React from 'react';

interface CompassIconProps {
  heading: number | null;
}

const CompassIcon: React.FC<CompassIconProps> = ({ heading }) => {
  if (heading === null || isNaN(heading)) {
    return null; // Don't render if heading is not available
  }

  const rotationStyle = {
    transform: `rotate(${heading}deg)`,
    width: '30px', // Adjust size as needed
    height: '30px', // Adjust size as needed
    display: 'inline-block',
    // Simple arrow representation for now, can be replaced with an SVG or image
    border: 'solid black',
    borderWidth: '0 3px 3px 0',
    padding: '3px',
    borderTopLeftRadius: '50%', // Makes it look a bit more like a compass needle
  };

  return (
    <div
      data-testid="compass-container"
      style={{
        position: 'absolute',
        top: '10px', // Adjust position as needed
        right: '10px', // Adjust position as needed
        zIndex: 1000, // Ensure it's above map tiles
        backgroundColor: 'white',
        padding: '5px',
        borderRadius: '50%',
        boxShadow: '0 0 5px rgba(0,0,0,0.3)',
      }}>
      <span style={rotationStyle}></span>
      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '2px' }}>
        {Math.round(heading)}°
      </div>
    </div>
  );
};

export default CompassIcon;
