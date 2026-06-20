import { addCollection } from '@iconify/vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from './App.vue'
import { riOfflineIcons } from './icons/ri-offline'
import { router } from './router'
import './styles/app.css'

// 离线注册用到的 ri 图标:同步即时渲染,不再向 api.iconify.design 异步拉取
// (消除"图标比文字慢"),离线 / Workers 部署同样可用。新增图标后重跑 scripts/gen-console-icons.ts。
addCollection(riOfflineIcons)

const naiveStyleAnchor = document.createElement('meta')
naiveStyleAnchor.name = 'naive-ui-style'
document.head.appendChild(naiveStyleAnchor)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App)
  .use(pinia)
  .use(router)
  .mount('#app')
