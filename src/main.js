import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './styles/app.css';
import './styles/vue.css';
import './styles/elder.css';
import './styles/elder-motion.css';
import App from './App.vue';
import { useAppStore } from './stores/app';
import { useCloudStore } from './stores/cloud';
import { useSpells } from './stores/spells';

window.addEventListener('vite:preloadError', event => {
  event.preventDefault();
  try {
    if (Date.now() - (+sessionStorage.getItem('pf1e-preload-reload') || 0) < 10000) return;
    sessionStorage.setItem('pf1e-preload-reload', String(Date.now()));
  } catch {
    /* storage off: reload anyway */
  }
  location.reload();
});

const app = createApp(App);
app.use(createPinia());

const store = useAppStore();
store.load();
store.startPersisting();
useCloudStore().init();
useSpells().load();

app.mount('#app');
