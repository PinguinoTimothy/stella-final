import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/app.css'
import './styles/vue.css'
import App from './App.vue'
import { useAppStore } from './stores/app'
import { useCloudStore } from './stores/cloud'
import { useSpells } from './stores/spells'

const app = createApp(App)
app.use(createPinia())

const store = useAppStore()
store.load()
store.startPersisting()
useCloudStore().init()
useSpells().load()

app.mount('#app')
