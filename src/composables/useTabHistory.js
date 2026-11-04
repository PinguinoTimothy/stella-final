// Makes the system Back button (Android, iOS swipe, browser) move between the app's tabs
// instead of leaving the app. Each tab change is recorded in the browser history.
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useAppStore } from '../stores/app';

export function useTabHistory() {
  const app = useAppStore();
  let skipNext = false; // a Back press changes the tab; the watcher must not record it again

  onMounted(() => {
    history.replaceState({ ...history.state, tab: app.ui.tab }, '');
    window.addEventListener('popstate', onPop);
  });

  const stop = watch(
    () => app.ui.tab,
    tab => {
      if (skipNext) {
        skipNext = false;
        return;
      }
      if (history.state?.tab === tab) return;
      history.pushState({ ...history.state, tab }, '');
    },
  );

  function onPop(e) {
    const tab = e.state?.tab;
    if (!tab || tab === app.ui.tab) return;
    skipNext = true;
    app.ui.tab = tab;
  }

  onBeforeUnmount(() => {
    window.removeEventListener('popstate', onPop);
    stop();
  });
}
