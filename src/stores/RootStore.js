import { MathStore } from './MathStore';
import { EditorStore } from './EditorStore';
import { SymbolStore } from './SymbolStore';
import { UIStore } from './UIStore';
import { SmartMenuStore } from './SmartMenuStore';
import { ActionStore } from './ActionStore';
import { ToolbarStateStore } from './ToolbarStateStore';
import { NotificationStore } from './NotificationStore';
import { ExternalStore } from './ExternalStore';

export class RootStore {
  constructor(initOptions = {}) {
    this.externalStore = new ExternalStore(this, initOptions);
    this.mathStore = new MathStore(this);
    this.editorStore = new EditorStore(this, initOptions);
    this.symbolStore = new SymbolStore(this);
    this.uiStore = new UIStore(this);
    this.smartMenuStore = new SmartMenuStore(this);
    this.notificationStore = new NotificationStore(this);
    this.actionStore = new ActionStore(this);
    this.toolbarStateStore = new ToolbarStateStore(this);
  }
}
