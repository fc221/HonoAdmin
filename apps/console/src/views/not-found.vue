<script setup lang="ts">
import { NButton, NResult } from 'naive-ui'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()

function goHome() {
  router.push('/')
}

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }

  router.push('/')
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-4 text-base-content">
    <NResult
      description="抱歉,你访问的页面不存在或已被移除。"
      size="huge"
      status="404"
      title="页面不存在"
    >
      <template #footer>
        <div class="flex items-center justify-center gap-3">
          <NButton @click="goBack">
            <template #icon>
              <AppIcon name="ri:arrow-left-line" />
            </template>
            返回上一页
          </NButton>
          <NButton type="primary" @click="goHome">
            <template #icon>
              <AppIcon name="ri:home-5-line" />
            </template>
            返回首页
          </NButton>
        </div>
      </template>
    </NResult>
  </main>
</template>
