<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-msg"
          :class="toast.type"
        >{{ toast.msg }}</div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

let uid = 0
const toasts = ref([])

function show(msg, type = 'info', duration = 2500) {
  const id = ++uid
  toasts.value.push({ id, msg, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

defineExpose({ show })
</script>

<style scoped>
.toast-enter-active { animation: toastIn 0.3s ease-out; }
.toast-leave-active { animation: toastIn 0.3s ease-in reverse; }
</style>
