import { RootStore } from './stores/RootStore';

class VietaMathRegistry {
  constructor() {
    this._instances = new Map(); // id → controller
    this._activeId = null;
    this._listeners = new Set(); // for toolbar/symbol pad updates

    this._dummyRootStore = new RootStore({
      focusOnInit: false,
      onChange: null,
    });

    this._dummyRootStore.editorStore.isEmbedded = true;
    this._dummyRootStore.editorStore.isDummy = true;
  }

  getDummyRootStore() {
    return this._dummyRootStore;
  }

  register(id, controller) {
    this._instances.set(id, controller);
  }

  // Race conditions can sometimes unregister an id
  // from a new node as the old and new lifecycles
  // can overlap.
  unregister(id, controller) {
    const current = this._instances.get(id);
    if (current === controller) {
      this._instances.delete(id);
    }
  }

  setActive(id) {
    if (this._activeId === id) return;

    for (const [otherId, controller] of this._instances.entries()) {
      const es = controller?.getRootStore()?.editorStore;
      if (!es) continue;

      es.isEditorDisabled = otherId !== id;

      if (otherId !== id && controller?.isActive?.()) {
        controller.clearEverything?.();
      }
    }

    this._activeId = id;
    this._notifyChange(this._instances.get(id) || null);
  }

  getActive() {
    return this._activeId ? this._instances.get(this._activeId) : null;
  }

  getActiveId() {
    return this._activeId;
  }

  onActiveChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyChange(controller) {
    this._listeners.forEach(fn => fn(controller));
  }

  clearActive() {
    if (this._activeId !== null) {
      this.setActive(null);
    }
  }

  getAllIds() {
    return Array.from(this._instances.keys());
  }

  hasInstance(id) {
    return this._instances.has(id);
  }

  getActiveControllers() {
    const result = [];
    for (const [id, controller] of this._instances.entries()) {
      if (controller?.isActive?.()) {
        result.push({ id, controller });
      }
    }
    return result;
  }

  reconcileActive() {
    const active = this.getActiveControllers();

    // Clear every active controller that is not the registry active
    active.forEach(({ id, controller }) => {
      if (id !== this._activeId) {
        controller.clearEverything?.();
      }
    });

    // If registry active is no longer actually active, reset it
    if (
      this._activeId !== null &&
      !active.some(x => x.id === this._activeId)
    ) {
      this._activeId = null;
      this._notifyChange(null);
    }
  }

}

export const registry = new VietaMathRegistry();
