export class UIRegistry {
  static mountToolbar(el: HTMLElement | null): void;
  static mountSymbolPad(el: HTMLElement | null): void;
  static mountSmartMenu(el: HTMLElement | null): void;
  static unmountToolbar(): void;
  static unmountSymbolPad(): void;
  static unmountSmartMenu(): void;
}

export interface VietaMathOptions {
  initialContent?: string;
  allowBoundaryExit?: boolean;
  focusOnInit?: boolean;
  symbolPadContainer?: HTMLElement | string | null;
  smartMenuContainer?: HTMLElement | string | null;
  onChange?: (rawLatex: string) => void;
  toolbarContainer?: HTMLElement | string | null;
  instanceId?: string;
  externalActions?: VietaMathExternalActions | null;
}

export interface VietaMathExternalActions {
  insertSymbol?: (initialLatex: string) => unknown;
  onCaretInserted?: () => void;
  onSetSelection?: (selection: unknown) => void;
  methods?: Record<string, (...args: unknown[]) => unknown>;
}

export class VietaMath {
  constructor(element: HTMLElement | string, options?: VietaMathOptions);

  instanceId: string;

  getLatex(): string;
  getSanitizedLatex(): string;
  setLatex(latex: string, pushToStack?: boolean, expand?: boolean): void;
  focus(): void;
  blur(): void;
  getStores(): unknown;
  destroy(): void;
}

export interface VietaMathRegistry {
  setActive(id: string): void;
  getActive(): any;
  getActiveId(): string | null;
  register(id: string, controller: any): void;
  unregister(id: string, controller: any): void;
  onActiveChange(listener: (controller: any | null) => void): () => void;
  clearActive(): void;
  getAllIds(): string[];
  hasInstance(id: string): boolean;
  getActiveControllers(): Array<{ id: string; controller: any }>;
  reconcileActive(): void;
  getDummyRootStore(): any;
}

export const registry: VietaMathRegistry;
