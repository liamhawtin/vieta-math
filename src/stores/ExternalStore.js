export class ExternalStore {
  insertSymbol = null;
  onCaretInserted = null;
  onSetSelection = null;

  afterMathMLFlush = [];

  // Generic method registry
  methods = Object.create(null);

  constructor(rootStore, initOptions = {}) {
    this.rootStore = rootStore;

    const externalActions = initOptions?.externalActions ?? {};

    if (externalActions.onCaretInserted) {
      this.onCaretInserted = externalActions.onCaretInserted;
    }

    if (externalActions.insertSymbol) {
      this.insertSymbol = externalActions.insertSymbol;
    }

    if (externalActions.onSetSelection) {
      this.onSetSelection = externalActions.onSetSelection;
    }

    // Optional: preload generic methods
    if (externalActions.methods) {
      Object.assign(this.methods, externalActions.methods);
    }
  }

  /* ---------------- Generic Methods API ---------------- */

  setMethod(name, fn) {
    this.methods[name] = fn;
  }

  removeMethod(name) {
    delete this.methods[name];
  }

  callMethod(name, ...args) {
    return this.methods[name]?.(...args);
  }

  /* ---------------- Existing Logic ---------------- */

  deferAfterMathML(fn) {
    this.afterMathMLFlush.push(fn);
  }

  flushAfterMathML() {
    if (!this.afterMathMLFlush.length) return;
    const fns = this.afterMathMLFlush;
    this.afterMathMLFlush = [];
    fns.forEach(fn => fn());
  }

  setInsertSymbol(fn) {
    this.insertSymbol = fn;
  }

  clearInsertSymbol() {
    this.insertSymbol = null;
  }

  setOnCaretInserted(fn) {
    this.onCaretInserted = fn;
  }

  clearOnCaretInserted() {
    this.onCaretInserted = null;
  }

  setOnSetSelection(fn) {
    this.onSetSelection = fn;
  }

  clearOnSetSelection() {
    this.onSetSelection = null;
  }
}
