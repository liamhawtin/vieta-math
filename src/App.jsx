import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/StoreContext';
import InteractiveMathML from '@components/InteractiveMathML/InteractiveMathML';
import HiddenFocusSink from '@components/HiddenFocusSink/HiddenFocusSink';
import GlobalKeyListener from "./GlobalKeyListener";
import './App.scss';

const App = observer(() => {
  const { editorStore, uiStore } = useStores();
  return (
    <div
      className="vieta-root vieta-math-app"
      ref={uiStore.setAppRootRef}
    >
      <HiddenFocusSink/>
      <GlobalKeyListener editorElement={editorStore.editorRef} />
      <InteractiveMathML />
    </div>
  );
});

export default App;
