export class VietaMathController {
  constructor(vmInstance, id) {
    this.vmInstance = vmInstance;
    this.id = id;
  }

  // Bad name, we use "active"-scheme for something else.
  isActive() {
    return (
      this.vmInstance.rootStore?.editorStore?.hasCaret?.() ||
      this.vmInstance.rootStore?.editorStore?.hasVisualSelection?.()
    ) ?? false;
  }

  insertCaret({ at = 'auto' } = {}) {
    const es = this.vmInstance.rootStore?.editorStore;
    if (!es) return;

    if (at === 'start') {
      es.enterAtFirstPosition?.();
    } else if (at === 'end') {
      es.enterAtLastPosition?.();
    } else {
      es.setCaretBasedOnPosition?.();
    }
  }

  clearEverything() {
    this.vmInstance.rootStore?.editorStore?.clearEverything?.();
  }

  insertSymbol(latex, range) {
    this.vmInstance.rootStore?.mathStore?.insertSymbol?.(latex, range);
  }

  getRootStore() {
    return this.vmInstance.rootStore || null;
  }

  isAtBoundary(direction) {
    const es = this.vmInstance.rootStore?.editorStore;
    if (!es) return false;
    return direction === 'left'
      ? es.isAtFirstPosition?.() ?? false
      : es.isAtLastPosition?.() ?? false;
  }

  smartMenuIsOpen() {
    return this.vmInstance.rootStore?.smartMenuStore?.isOpen;
  }

  selectEntireExpression() {
    this.vmInstance.rootStore.editorStore.selectEntireExpression();
  }

  selectAllAndMarkForDeletion() {
    this.vmInstance.rootStore.editorStore.selectAllAndMarkForDeletion();
  }

  deferAfterMathML(fn) {
    this.vmInstance.rootStore?.externalStore.deferAfterMathML(fn);
  }

  getLatex() {
    return this.vmInstance?.getLatex?.() ?? '';
  }

  setLatex(latex, pushToStack = false, expand = true) {
    this.vmInstance?.setLatex?.(latex, pushToStack, expand);
  }

  setSelectionWithCaret(selection) {
    this.vmInstance.rootStore.editorStore.setSelection(selection);
    this.vmInstance.rootStore.editorStore.setCaretBasedOnPosition();
  }

  focus() {
    this.vmInstance?.focus?.();
  }

  blur() {
    this.vmInstance?.blur?.();
  }

  getInstance() {
    return this.vmInstance;
  }
}
