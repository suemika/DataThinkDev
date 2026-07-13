import { createRouter, createWebHashHistory } from 'vue-router'
import IndexView from '@/views/IndexView.vue'
import AuditView from '@/views/AuditView.vue'

const routes = [
  { path: '/', name: 'index', component: IndexView },
  { path: '/audit', name: 'audit', component: AuditView }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
