import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './styles/app.css'

const naiveStyleAnchor = document.createElement('meta')
naiveStyleAnchor.name = 'naive-ui-style'
document.head.appendChild(naiveStyleAnchor)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App)
  .use(pinia)
  .use(router)
  .mount('#app')
