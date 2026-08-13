import { configure } from 'mobx';
import '@styles/global.scss';
import '@styles/math-fonts.css';

// Enable MobX strict mode
configure({
  enforceActions: 'never',
  useProxies: 'always',
  computedRequiresReaction: false,
  reactionRequiresObservable: false,
  observableRequiresReaction: false,
  disableErrorBoundaries: false
});

export { VietaMath, UIRegistry } from './VietaMath';
export { registry } from './VietaMathRegistry';
