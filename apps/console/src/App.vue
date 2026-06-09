<script setup lang="ts">
import AppShell from './AppShell.vue'
import ThemeProvider from './components/theme/ThemeProvider.vue'
</script>

<template>
  <ThemeProvider>
    <AppShell />
  </ThemeProvider>
</template>
