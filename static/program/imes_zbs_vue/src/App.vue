<template>
  <AppToast ref="toastRef" />
  <router-view />
  <AppFooter />
  <BackToTop />
</template>

<script setup>
import { ref, provide } from 'vue'
import AppToast from '@/components/AppToast.vue'
import AppFooter from '@/components/AppFooter.vue'
import BackToTop from '@/components/BackToTop.vue'

const toastRef = ref(null)
provide('toast', toastRef)
</script>
