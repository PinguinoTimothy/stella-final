// Player mode: loads the shared game now, then every 10 s and whenever the tab becomes visible again.
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'

const INTERVAL = 10000

export function useViewerPolling() {
  const app = useAppStore()
  let timer = 0
  const refresh = () => { if (!document.hidden && app.viewer) app.loadViewer() }

  onMounted(() => {
    if (!app.viewer) return
    app.loadViewer()
    timer = setInterval(refresh, INTERVAL)
    document.addEventListener('visibilitychange', refresh)
  })
  onUnmounted(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', refresh)
  })
}
