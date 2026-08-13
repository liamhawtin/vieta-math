import React from 'react';
import ReactDOM from 'react-dom/client';

import lme from 'lme';

import App from './App';
import { StoreProvider } from './stores/StoreContext';
import { RootStore } from './stores/RootStore';
import { registry } from './VietaMathRegistry';
import { VietaMathController } from './VietaMathController';

import { ActiveMathToolbar } from './components/MathToolbar/ActiveMathToolbar';
import { ActiveSymbolPad } from './components/SymbolPad/ActiveSymbolPad';
import { ActiveSmartMenu } from './components/SmartMenu/ActiveSmartMenu';

// Can't use crypto on safari it seems
function shortId8() {
  return Math.random().toString(36).padEnd(10, '0').slice(2, 10);
}

export class UIRegistry {
  static toolbarRoot = null;
  static toolbarContainer = null;

  static symbolPadRoot = null;
  static symbolPadContainer = null;

  static smartMenuRoot = null;
  static smartMenuContainer = null;

  static mountToolbar(container) {
    if (!container) return;

    if (
      UIRegistry.toolbarRoot &&
      UIRegistry.toolbarContainer !== container
    ) {
      const old = UIRegistry.toolbarRoot;
      UIRegistry.toolbarRoot = null;
      UIRegistry.toolbarContainer = null;
      queueMicrotask(() => old.unmount());
    }

    if (!UIRegistry.toolbarRoot) {
      UIRegistry.toolbarRoot = ReactDOM.createRoot(container);
      UIRegistry.toolbarContainer = container;
    }

    UIRegistry.toolbarRoot.render(<ActiveMathToolbar />);
  }

  static mountSymbolPad(container) {
    if (!container) return;

    if (
      UIRegistry.symbolPadRoot &&
      UIRegistry.symbolPadContainer !== container
    ) {
      const old = UIRegistry.symbolPadRoot;
      UIRegistry.symbolPadRoot = null;
      UIRegistry.symbolPadContainer = null;
      queueMicrotask(() => old.unmount());
    }

    if (!UIRegistry.symbolPadRoot) {
      UIRegistry.symbolPadRoot = ReactDOM.createRoot(container);
      UIRegistry.symbolPadContainer = container;
    }

    UIRegistry.symbolPadRoot.render(<ActiveSymbolPad />);
  }

  static mountSmartMenu(container) {
    if (!container) return;

    if (
      UIRegistry.smartMenuRoot &&
      UIRegistry.smartMenuContainer !== container
    ) {
      const old = UIRegistry.smartMenuRoot;
      UIRegistry.smartMenuRoot = null;
      UIRegistry.smartMenuContainer = null;
      queueMicrotask(() => old.unmount());
    }

    if (!UIRegistry.smartMenuRoot) {
      UIRegistry.smartMenuRoot = ReactDOM.createRoot(container);
      UIRegistry.smartMenuContainer = container;
    }

    UIRegistry.smartMenuRoot.render(<ActiveSmartMenu />);
  }

  static unmountToolbar() {
    const root = UIRegistry.toolbarRoot;
    UIRegistry.toolbarRoot = null;
    UIRegistry.toolbarContainer = null;
    if (root) queueMicrotask(() => root.unmount());
  }

  static unmountSymbolPad() {
    const root = UIRegistry.symbolPadRoot;
    UIRegistry.symbolPadRoot = null;
    UIRegistry.symbolPadContainer = null;
    if (root) queueMicrotask(() => root.unmount());
  }

  static unmountSmartMenu() {
    const root = UIRegistry.smartMenuRoot;
    UIRegistry.smartMenuRoot = null;
    UIRegistry.smartMenuContainer = null;
    if (root) queueMicrotask(() => root.unmount());
  }
}

export class VietaMath {

  constructor(containerOrSelector, options = {}) {
    this.options = {
      symbolPadContainer: null,
      toolbarContainer: null,
      smartMenuContainer: null,
      initialContent: '',
      instanceId: '',
      onChange: null,
      allowBoundaryExit: false,
      focusOnInit: false,
      externalActions: null,
      ...options
    };

    this.toolbarContainer = this._resolveContainer(this.options.toolbarContainer);
    this.symbolPadContainer = this._resolveContainer(this.options.symbolPadContainer);
    this.smartMenuContainer = this._resolveContainer(this.options.smartMenuContainer);

    // Get container element
    if (typeof containerOrSelector === 'string') {
      this.container = document.querySelector(containerOrSelector);
    } else {
      this.container = containerOrSelector;
    }

    if (!this.container) {
      throw new Error('VietaMath: Container element not found');
    }

    // Create root element inside container
    this.editorRoot = document.createElement('div');
    this.editorRoot.className = 'vieta-math-root';
    this.editorRoot.style.display = 'initial';
    this.container.appendChild(this.editorRoot);

    // Initialize React root
    this.reactRoot = ReactDOM.createRoot(this.editorRoot);

    // Create stores
    this.rootStore = new RootStore({
      focusOnInit: this.options.focusOnInit,
      onChange: this.options.onChange,
      externalActions: this.options.externalActions
    });

    // Set initial content if provided
    if (this.options.initialContent) {
      this.setLatex(this.options.initialContent);
    }

    // Set embedded mode flag if specified
    if (this.options.allowBoundaryExit) {
      this.rootStore.editorStore.isEmbedded = true;
    }

    if (this.options.instanceId) {
      this.instanceId = this.options.instanceId;
    } else {
      this.instanceId = `vieta-math-${shortId8()}`;
    }

    // Create controller and register with global registry
    this.controller = new VietaMathController(this, this.instanceId);
    registry.register(this.instanceId, this.controller);

    // Render the app
    this.render();

    // Set up activation listeners after render
    this._setupActivationListeners();
  }

  _resolveContainer(input) {
    if (!input) return null;
    return typeof input === 'string'
      ? document.querySelector(input)
      : input;
  }

  render() {
    this.reactRoot.render(
      <StoreProvider rootStore={this.rootStore}>
        <App />
      </StoreProvider>
    );
  }

  getLatex() {
    return this.rootStore.mathStore?.expression || '';
  }

  /**
   * Sanitizes and exports the internal LaTeX using LME.
   * Keeps LME under the hood while providing clean text output.
   */
  getSanitizedLatex() {
    const raw = this.getLatex();
    try {
      return lme.exportString(raw) || "";
    } catch {
      return "";
    }
  }

  setLatex(latex, pushToStack = false, expand = true) {
    if (this.rootStore.mathStore) {
      let newLatex = latex;
      if (expand) {
        newLatex = lme.expandString(newLatex);
      }
      this.rootStore.editorStore.updateExpression(newLatex, pushToStack);
    }
  }

  focus() {
    if (this.rootStore.editorStore) {
      this.rootStore.editorStore.setFocus();
    }
  }

  blur() {
    if (this.rootStore.editorStore?.editorRef) {
      this.rootStore.editorStore.editorRef.blur();
    }
  }

  getStores() {
    return this.rootStore;
  }

  _setupActivationListeners() {
    this._activateHandler = () => {
      // A pointerdown can happen after this editor already rendered its caret.
      // In that case `isActive()` is true before the registry has selected an
      // owner, which leaves shared UI such as the Smart Menu disconnected.
      if (registry.getActiveId() !== this.instanceId) {
        registry.setActive(this.instanceId);
      }
    };

    // The wrapper exists before React creates the editor ref, so register
    // pointer activation immediately. Waiting for the ref creates a brief
    // startup race where Tab can open no shared UI at all.
    this.editorRoot.addEventListener('pointerdown', this._activateHandler);

    // Wait for the editor ref created during the first React render.
    this._activationTimeout = setTimeout(() => {
      const es = this.rootStore?.editorStore;
      if (es?.editorRef) {
        this._blurHandler = (e) => {
          const nextTarget =
            e.relatedTarget || document.activeElement;

          const isInside = (container) =>
            container && nextTarget && container.contains(nextTarget);

          const blurCausedByUI =
            isInside(this.symbolPadContainer) ||
            isInside(this.toolbarContainer) ||
            isInside(this.smartMenuContainer);

          if (blurCausedByUI) {
            if (!nextTarget?.matches?.(':read-write')) {
              requestAnimationFrame(() => {
                this.focus();
              });
            }
            return;
          }

          const instanceRoot = this.controller?.id
            ? document.querySelector(
                `[data-instance-id="${this.controller.id}"]`
              )
            : null;

          if (!isInside(instanceRoot)) {
            this.controller.clearEverything();
          }
        };
        es.editorRef.addEventListener('blur', this._blurHandler, true);
      }
    }, 100);
  }

  destroy() {

    if (this._activationTimeout) {
      clearTimeout(this._activationTimeout);
      this._activationTimeout = null;
    }

    // Unregister from global registry
    registry.unregister(this.instanceId, this.controller);

    // Remove activation listener
    if (this._activateHandler && this.editorRoot) {
      this.editorRoot.removeEventListener('pointerdown', this._activateHandler);
    }

    // Remove blur listener
    if (this._blurHandler && this.rootStore.editorStore?.editorRef) {
      this.rootStore.editorStore.editorRef.removeEventListener('blur', this._blurHandler, true);
    }

    // Remove focus listener
    if (this.focusHandler && this.rootStore.editorStore?.editorRef) {
      this.rootStore.editorStore.editorRef.removeEventListener('focus', this.focusHandler, true);
    }

    this.reactRoot?.unmount();
    this.reactRoot = null;

    // Shared UI is managed globally and is not destroyed per instance.
    if (this.editorRoot && this.editorRoot.parentNode) {
      this.editorRoot.parentNode.removeChild(this.editorRoot);
    }
    this.editorRoot = null;
  }
}
