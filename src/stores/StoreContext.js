import React from 'react';
import { RootStore } from './RootStore';

const StoreContext = React.createContext(null);

const StoreProvider = ({ children, rootStore: externalRootStore }) => {
  const rootStore = React.useMemo(() =>
    externalRootStore || new RootStore(),
    [externalRootStore]
  );

  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
};

const useStores = () => {
  const context = React.useContext(StoreContext);
  if (context === null) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  return context;
};

// Convenience hooks for individual stores
const useExternalStore = () => useStores().externalStore;
const useEditorStore = () => useStores().editorStore;
const useMathStore = () => useStores().mathStore;
const useSymbolStore = () => useStores().symbolStore;
const useUIStore = () => useStores().uiStore;
const useSmartMenuStore = () => useStores().smartMenuStore;
const useActionStore = () => useStores().actionStore;
const useToolbarStateStore = () => useStores().toolbarStateStore;
const useNotificationStore = () => useStores().notificationStore;

export {
  StoreContext,
  StoreProvider,
  useStores,
  useExternalStore,
  useEditorStore,
  useMathStore,
  useSymbolStore,
  useUIStore,
  useSmartMenuStore,
  useActionStore,
  useToolbarStateStore,
  useNotificationStore,
};
