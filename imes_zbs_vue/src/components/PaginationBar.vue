<template>
  <div class="pagination-wrapper" v-if="total > 0">
    <div class="pagination-info">
      共 <strong>{{ total }}</strong> 条，
      第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页
    </div>
    <nav>
      <ul class="pagination">
        <li class="page-item" :class="{ disabled: currentPage <= 1 }">
          <a class="page-link" @click="changePage(currentPage - 1)">
            <i class="bi bi-chevron-left"></i>
          </a>
        </li>
        <li v-if="startPage > 1" class="page-item">
          <a class="page-link" @click="changePage(1)">1</a>
        </li>
        <li v-if="startPage > 2" class="page-item disabled">
          <span class="page-link">...</span>
        </li>
        <li
          v-for="p in visiblePages"
          :key="p"
          class="page-item"
          :class="{ active: p === currentPage }"
        >
          <a class="page-link" :class="{ active: p === currentPage }" @click="changePage(p)">{{ p }}</a>
        </li>
        <li v-if="endPage < totalPages - 1" class="page-item disabled">
          <span class="page-link">...</span>
        </li>
        <li v-if="endPage < totalPages" class="page-item">
          <a class="page-link" @click="changePage(totalPages)">{{ totalPages }}</a>
        </li>
        <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
          <a class="page-link" @click="changePage(currentPage + 1)">
            <i class="bi bi-chevron-right"></i>
          </a>
        </li>
      </ul>
    </nav>
    <div>
      <select class="form-select" :value="pageSize" @change="$emit('update:pageSize', Number($event.target.value))" style="width:auto; display:inline;">
        <option :value="20">20条/页</option>
        <option :value="50">50条/页</option>
        <option :value="100">100条/页</option>
        <option :value="200">200条/页</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 50 }
})

const emit = defineEmits(['update:currentPage', 'update:pageSize'])

const totalPages = computed(() => Math.ceil(props.total / props.pageSize) || 1)

const startPage = computed(() => {
  const half = 3
  return Math.max(1, props.currentPage - half)
})

const endPage = computed(() => {
  const half = 3
  return Math.min(totalPages.value, props.currentPage + half)
})

const visiblePages = computed(() => {
  const pages = []
  for (let i = startPage.value; i <= endPage.value; i++) pages.push(i)
  return pages
})

function changePage(p) {
  if (p < 1 || p > totalPages.value) return
  emit('update:currentPage', p)
}
</script>
