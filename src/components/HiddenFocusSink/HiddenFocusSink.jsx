import React from 'react';

const HiddenFocusSink = () => (
  <div
    id="ime-focus-sink"
    tabIndex={-1}
    role="none"
    style={{
      //position: 'fixed',
      width: 1,
      height: 1,
      padding: 0,
      margin: 0,
      border: 0,
      outline: 'none',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
      opacity: 0,
      pointerEvents: 'none',
      zIndex: -1,
    }}
  />
);

export default HiddenFocusSink;
