import { makeAutoObservable } from 'mobx';

const HISTORY_CONFIG = {
  MAX_HISTORY_SIZE: 200,
  MEMORY_CLEANUP_THRESHOLD: 150
};

export class ActionStore {
  undoStack = [];
  redoStack = [];
  maxHistorySize = HISTORY_CONFIG.MAX_HISTORY_SIZE;
  isCapturing = true;

  // Performance tracking
  memoryUsage = 0;
  lastCleanupTime = 0;

  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }

  // Push current state to undo stack
  pushState(description = 'Edit') {
    if (!this.isCapturing) return;

    const currentState = this.getCurrentState();

    // Don't push if state hasn't changed
    if (this.undoStack.length > 0) {
      const lastState = this.undoStack[this.undoStack.length - 1];
      if (this.statesEqual(currentState.state, lastState.state)) {
        return;
      }
    }

    this.undoStack.push({
      state: JSON.parse(JSON.stringify(currentState.state)),
      description,
      timestamp: Date.now()
    });

    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Limit stack size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

  }

  undo() {
    if (this.undoStack.length === 0) return false;

    const currentState = this.getCurrentState();
    const previousState = this.undoStack.pop();

    // Push current state to redo stack
    this.redoStack.push({
      state: JSON.parse(JSON.stringify(currentState.state)),
      description: 'Redo',
      timestamp: Date.now()
    });

    // Restore previous state
    this.restoreState(previousState.state);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;

    const currentState = this.getCurrentState();
    const nextState = this.redoStack.pop();

    // Push current state to undo stack
    this.undoStack.push({
      state: JSON.parse(JSON.stringify(currentState.state)),
      description: 'Undo',
      timestamp: Date.now()
    });

    // Restore next state
    this.restoreState(nextState.state);
    return true;
  }

  getCurrentState() {
    return {
      state: {
        expression: this.rootStore.mathStore.expression,
        selection: this.rootStore.editorStore.selection,
        cursorPosition: this.rootStore.editorStore.selection.range.end,
      }
    };
  }

  restoreState(state) {
    // Temporarily disable capturing to avoid creating undo entries during restore
    this.isCapturing = false;

    try {
      this.rootStore.editorStore.updateExpression(state.expression, false);
      if (state.selection) {
        const end = state.selection.range.end;
        this.rootStore.editorStore.setSelection({start: end, end});
        this.rootStore.editorStore.setCaretBasedOnPosition();
      } else {
        const length = state.expression.length;
        this.rootStore.editorStore.setSelection({start: length, end: length});
        this.rootStore.editorStore.setCaretBasedOnPosition();
      }
    } finally {
      this.isCapturing = true;
    }
  }

  statesEqual(state1, state2) {
    return JSON.stringify(state1) === JSON.stringify(state2);
  }

  // Clear all history
  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
  }

  // Computed properties
  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get undoDescription() {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  get redoDescription() {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }

  checkMemoryUsage() {
    const now = Date.now();

    // Only check memory every 30 seconds
    if (now - this.lastCleanupTime < 30000) return;

    if (this.undoStack.length > HISTORY_CONFIG.MEMORY_CLEANUP_THRESHOLD) {
      this.performMemoryCleanup();
      this.lastCleanupTime = now;
    }
  }

  performMemoryCleanup() {
    const keepCount = 50;
    const removeCount = this.undoStack.length - keepCount;

    if (removeCount > 0) {
      this.undoStack.splice(0, removeCount);
    }
  }

  // Restore to specific version (for version history modal)
  restoreToVersion(index) {
    if (index < 0 || index >= this.undoStack.length) return false;

    const targetState = this.undoStack[index];

    // Move everything after the target to redo stack
    const itemsToRedo = this.undoStack.splice(index + 1);
    this.redoStack = itemsToRedo.reverse();

    // Restore the target state
    this.restoreState(targetState.state);
    return true;
  }
}
