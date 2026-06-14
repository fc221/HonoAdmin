<script setup lang="ts">
import { RouterView } from 'vue-router'
import ThemeProvider from './components/theme/ThemeProvider.vue'
</script>

<template>
  <ThemeProvider>
    <RouterView />
  </ThemeProvider>
</template>
