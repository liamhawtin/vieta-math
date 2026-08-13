import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StoreProvider } from '../../stores/StoreContext';
import SmartMenu from './SmartMenu';
import { registry } from '../../VietaMathRegistry';

export const ActiveSmartMenu = observer(() => {
  const [activeController, setActiveController] = useState(null);

  useEffect(() => {
    const unsubscribe = registry.onActiveChange(setActiveController);
    setActiveController(registry.getActive());
    return unsubscribe;
  }, []);

  const rootStore = activeController?.getRootStore?.();
  if (!rootStore) return null;

  return (
    <StoreProvider rootStore={rootStore}>
      <SmartMenu />
    </StoreProvider>
  );
});
