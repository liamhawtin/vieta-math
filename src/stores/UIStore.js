import { makeAutoObservable } from 'mobx';

export class UIStore {
  rootStore;

  appRootRef = null;

  fontsReady = false;
  appInitialized = false;

  constructor(rootStore) {
    makeAutoObservable(this, {
      rootStore: false,
      appRootRef: false,
    });
    this.rootStore = rootStore;
    this.initializeApp();
  }

  async initializeApp() {
    try {
      await this.waitForLatinModernMath();
      this.fontsReady = true;
      this.appInitialized = true;
    } catch (error) {
      console.warn('Font loading failed, continuing anyway:', error);
      this.fontsReady = false;
      this.appInitialized = true;
    }
  }

  async waitForLatinModernMath() {
    if (!('fonts' in document)) {
      return new Promise(resolve => setTimeout(resolve, 300));
    }
    await document.fonts.ready;
    try {
      await document.fonts.load('1em "Latin Modern Math Upright"');
    } catch (e) {
      // Fallback - wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  setAppRootRef = (node) => {
    this.appRootRef = node;
  };

  isFormElementFocused() {
    const activeElement = document.activeElement;
    return activeElement?.tagName === 'INPUT' ||
           activeElement?.tagName === 'TEXTAREA';
  }

  isVisualEditorFocused() {
    return this.rootStore.editorStore.editorRef?.contains(document.activeElement);
  }

}
