import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StoreProvider } from '../../stores/StoreContext';
import MathToolbar from './MathToolbar';
import { registry } from '../../VietaMathRegistry';

export const ActiveMathToolbar = observer(() => {
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
      <MathToolbar />
    </StoreProvider>
  );
});
