import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StoreProvider } from '../../stores/StoreContext';
import SymbolPad from './SymbolPad';
import { registry } from '../../VietaMathRegistry';

export const ActiveSymbolPad = observer(() => {
  const [activeController, setActiveController] = useState(null);

  useEffect(() => {
    const unsubscribe = registry.onActiveChange(setActiveController);
    setActiveController(registry.getActive());
    return unsubscribe;
  }, []);

  const rootStore = activeController?.getRootStore?.() || registry.getDummyRootStore();
  if (!rootStore) return null;

  return (
    <StoreProvider rootStore={rootStore}>
      <SymbolPad key={activeController?.id || "dummy"} />
    </StoreProvider>
  );
});
