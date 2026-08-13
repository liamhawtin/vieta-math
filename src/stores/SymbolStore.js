import { makeAutoObservable } from 'mobx';
import symbolData from '@data/symbolpad-data.json';
import defaultSymbols from '@data/default-symbols.json';

const symbolsBus = new EventTarget();
const RECENT_SYMBOLS_UPDATED = 'recentSymbolsUpdated';
const ACTIVE_TAB_UPDATED = 'activeTabUpdated';

const MAX_RECENT_SYMBOLS = 100;

export class SymbolStore {
  activeTab = 'recent';
  recentSymbols = [];
  rootStore;

  constructor(rootStore) {
    makeAutoObservable(this, {
      rootStore: false
    });
    this.rootStore = rootStore;
    this.loadActiveTab();
    this.loadRecentSymbols();

    symbolsBus.addEventListener(
      RECENT_SYMBOLS_UPDATED,
      () => this.loadRecentSymbols()
    );
    symbolsBus.addEventListener(
      ACTIVE_TAB_UPDATED,
      () => this.loadActiveTab()
    );

  }

  setActiveTab(tab) {
    this.activeTab = tab;
    localStorage.setItem('activeTab', tab);
    symbolsBus.dispatchEvent(new Event(ACTIVE_TAB_UPDATED))
  }

  loadActiveTab() {
    let saved = localStorage.getItem('activeTab');
    if (saved) {
      if (saved === 'search') saved = 'recent';
      this.activeTab = saved;
    }
  }

  addRecentSymbol(symbol) {
    if (!symbol?.latex) return;
    const original = this.findOriginalSymbol(symbol.latex);
    const symbolToStore = original || symbol;

    const nextRecentSymbols = [
      symbolToStore,
      ...this.recentSymbols.filter(s => s.latex !== symbolToStore.latex)
    ].slice(0, MAX_RECENT_SYMBOLS);

    localStorage.setItem('recentSymbols', JSON.stringify(nextRecentSymbols));
    symbolsBus.dispatchEvent(
      new CustomEvent(RECENT_SYMBOLS_UPDATED, { detail: nextRecentSymbols })
    );
  }

  findOriginalSymbol(latex) {
    for (const tab of symbolData.tabs) {
      for (const category of tab.categories) {
        for (const symbol of category.symbols) {
          if (symbol.latex === latex) return symbol;
          if (symbol.variants) {
            const match = symbol.variants.find(v => v.latex === latex);
            if (match) return match;
          }
        }
      }
    }
  }

  getCategoryToggleState(categoryName, toggleType = 'auto') {
    // Use localStorage directly (no settings store in library)
    const key = `symbolPad.categoryToggles.${categoryName}.${toggleType}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : false;
  }

  setCategoryToggleState(categoryName, toggleType = 'auto', enabled) {
    // Use localStorage directly (no settings store in library)
    const key = `symbolPad.categoryToggles.${categoryName}.${toggleType}`;
    localStorage.setItem(key, JSON.stringify(enabled));
  }

  loadRecentSymbols() {
    const saved = localStorage.getItem('recentSymbols');
    if (saved) {
      try {
        this.recentSymbols = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load recent symbols:', e);
      }
    }
    if (!saved) {
      try {
        const transformedDefaults = defaultSymbols
          .map(symbol => this.findOriginalSymbol(symbol.latex))
          .filter(symbol => symbol !== undefined);

        this.recentSymbols = transformedDefaults;
        localStorage.setItem('recentSymbols', JSON.stringify(this.recentSymbols));
      } catch (e) {
        console.error('Failed to load default symbols:', e);
      }
    }
  }

  get categoryToggleStates() {
    const toggles = {};

    // Get all categories that have autoScalable property
    symbolData.tabs.forEach(tab => {
      tab.categories.forEach(category => {
        if (category.autoScalable) {
          toggles[category.name] = this.getCategoryToggleState(category.name);
        }
      });
    });

    return toggles;
  }

}
