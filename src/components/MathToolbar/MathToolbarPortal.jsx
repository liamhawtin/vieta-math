import React from 'react';
import ReactDOM from 'react-dom';
import { StoreProvider } from '@stores/StoreContext';
import MathToolbar from './MathToolbar';

/**
 * MathToolbarPortal - Renders the MathToolbar into a separate DOM element using React Portals
 *
 * This allows the toolbar to be positioned anywhere in the DOM tree while maintaining
 * access to the shared store context (for state management across editor and toolbar).
 *
 * @param {Object} props
 * @param {HTMLElement} props.container - The DOM element where the toolbar should be rendered
 * @param {Object} props.rootStore - The shared RootStore instance
 */
function MathToolbarPortal({ container, rootStore }) {
  if (!container) {
    return null;
  }

  return ReactDOM.createPortal(
    <StoreProvider value={rootStore}>
      <MathToolbar />
    </StoreProvider>,
    container
  );
}

export default MathToolbarPortal;
