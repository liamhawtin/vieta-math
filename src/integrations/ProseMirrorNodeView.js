import { registry } from "vieta-math";
import { closeHistory } from "prosemirror-history";
import { ensureMathLineVisible } from './vietaMathCommands'

export function createVietaMathNodeView(VietaMathClass, options = {}) {
  const resolvedOptions = {
    toolbarContainer: null,
    symbolPadContainer: null,
    smartMenuContainer: null,
    externalMethods: null,
    ...options
  };

  return function vietaMathNodeView(node, view, getPos) {
    return new VietaMathInlineView(
      node,
      view,
      getPos,
      VietaMathClass,
      resolvedOptions
    );
  };
}

class VietaMathInlineView {
  constructor(node, view, getPos, VietaMathClass, opts) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.VietaMathClass = VietaMathClass;
    this.toolbarContainer = opts.toolbarContainer;
    this.symbolPadContainer = opts.symbolPadContainer;
    this.smartMenuContainer = opts.smartMenuContainer;
    this.externalMethods = opts.externalMethods;

    // Create unique ID for this node if not present
    this.id = node.attrs.id || `pm-inline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.instanceId = node.attrs?.instanceId || '';

    // Build DOM structure
    this.dom = document.createElement("span");
    this.dom.className = "pm-vieta-math-wrapper";
    this.dom.setAttribute("data-id", this.id);

    this.mount = document.createElement("span");
    this.mount.className = "pm-vieta-math-mount";
    this.dom.appendChild(this.mount);

    // Mount VietaMath instance
    this._mounted = false;
    this._ensureMounted();

    // Set up activation on click
    this._onPointerDown = (e) => {
      this._activate();
    };

    this.dom.addEventListener('pointerdown', this._onPointerDown);
  }

  /**
   * Update node attributes (called when document changes externally)
   */
  update(node) {
    if (node.type !== this.node.type) return false;

    if (node.attrs.instanceId !== this.node.attrs.instanceId) {
      return false; // identity changed → recreate
    }

    this.node = node;

    // Sync latex if changed externally and we're not active
    const isActive = registry.getActiveId() === this.vmInstance.instanceId;
    if (!isActive && this._mounted) {
      const newLatex = node.attrs.latex || '';
      const currentLatex = this.vmInstance?.getLatex?.() ?? '';
      if (newLatex !== currentLatex) {
        this.vmInstance?.setLatex?.(newLatex);
      }
    }

    return true;
  }

  stopEvent(_event) {
    // ProseMirror must leave events inside the active embedded editor alone.
    return registry.getActiveId() === this.instanceId;
  }

  ignoreMutation(_mutation) {
    return true;
  }

  selectNode() {
    this._activate();
  }

  deselectNode() {
    // Don't automatically deactivate - let registry handle it
  }

  destroy() {
    this.dom.removeEventListener('pointerdown', this._onPointerDown);

    if (this.vmInstance) {
      this.vmInstance.destroy(); // This also unregisters from registry
      this.vmInstance = null;
    }

    this._mounted = false;
  }

  /**
   * Activate this math instance (insert caret, set as active in registry)
   * @private
   */
  _activate() {
    const { state, dispatch } = this.view;
    const pmSelection = state.selection;

    // If we enter a math node after having an AllSelection
    // it causes a lot of issues. The only solution to fix this
    // Seems to be this workaround of capturing a previous valid
    // selection and collpasing it before actually entering the
    // math node.

    // Capture and cache a usable Selection constructor
    const currentCtor = pmSelection?.constructor;
    if (typeof currentCtor?.create === "function") {
      this._selectionCtor = currentCtor;
    }

    if (!pmSelection.empty) {
      const pos = this.getPos();
      let nextSelection = null;

      // Use cached constructor only
      if (this._selectionCtor) {
        try {
          nextSelection = this._selectionCtor.create(state.doc, pos);
        } catch {
          nextSelection = null;
        }
      }

      if (nextSelection) {
        dispatch(
          state.tr
            .setSelection(nextSelection)
            .scrollIntoView()
            .setMeta("ignoreFilterTransaction", true)
        );
      }
    }

    registry.setActive(this.vmInstance.instanceId);
    this.vmInstance.focus();
  }

  _ensureMounted() {
    if (this._mounted) return;

    // Clear placeholder
    this.mount.textContent = '';
    this.mount.style.color = '';
    this.mount.style.fontStyle = '';

    const { from, to } = this.view.state.selection;
    const maxPos = Math.max(from, to);
    const focusOnInit = maxPos === this.getPos?.() + 1;

    // Create VietaMath instance
    this.vmInstance = new this.VietaMathClass(this.mount, {
      initialContent: this.node.attrs.latex || "",
      instanceId: this.instanceId,
      allowBoundaryExit: true,
      onChange: (latex, data) => this._handleChange(latex, data),
      toolbarContainer: this.toolbarContainer,
      symbolPadContainer: this.symbolPadContainer,
      smartMenuContainer: this.smartMenuContainer,
      focusOnInit,
      externalActions: {
        onCaretInserted: () => ensureMathLineVisible(this.view),
        onSetSelection: (selection) => this._setSelection(selection),
        methods: this.externalMethods,
      }
    });

    this.instanceId = this.vmInstance.instanceId;
    this.node.attrs.instanceId = this.vmInstance.instanceId;
    this.dom.setAttribute("data-instance-id", this.vmInstance.instanceId);

    if (focusOnInit) {
      this._activate();
      this.vmInstance.rootStore?.editorStore?.setCaretBasedOnPosition?.();
    } else {
      this.vmInstance.rootStore?.editorStore?.clearEverything?.();
    }

    this._mounted = true;
  }

  _setSelection(selection) {
    const pos = this.getPos();
    if (typeof pos !== 'number') return;

    const prevData = this.node.attrs.vietaData ?? {};
    const nextData = {
      ...prevData,
      selection,
    };

    const tr = this.view.state.tr
      .setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        vietaData: nextData,
      })
      .setMeta(closeHistory, true)
      .setMeta("ignoreFilterTransaction", true)
      .setMeta('addToHistory', false);

    this.view.dispatch(tr);
  }

  _handleChange(latex, data = {}) {
    if (!this.view.state.tr) return;
    const pos = this.getPos();
    if (typeof pos !== 'number') return;

    const currentLatex = this.node.attrs.latex || '';
    if (latex === currentLatex) return;

    const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      latex,
      vietaData: data,
    }).setMeta('vietaMath', true)
      .setMeta(closeHistory, true);

    this.view.dispatch(tr);
  }
}
