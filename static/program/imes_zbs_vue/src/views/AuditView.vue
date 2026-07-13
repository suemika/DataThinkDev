<template>
  <div>
    <div id="loading-overlay" v-if="checking">
      <div class="loading-content">
        <div class="diamond-loader"><div class="diamond"></div></div>
        <p>正在验证权限...</p>
      </div>
    </div>

    <div v-if="!checking && !hasPermission" class="container" style="margin-top: 60px;">
      <div class="card">
        <div class="card-body text-center py-5">
          <i class="bi bi-shield-lock" style="font-size: 4rem; color: var(--danger-color);"></i>
          <h4 class="mt-3">无访问权限</h4>
          <p class="text-muted">您没有访问审核页面的权限，请联系管理员。</p>
          <a href="/program/imes_zbs_vue/index.html" class="btn btn-primary rounded-4 mt-2">返回台账页</a>
        </div>
      </div>
    </div>

    <template v-if="hasPermission">
    <div id="loading-overlay" v-if="loading">
      <div class="loading-content">
        <div class="diamond-loader">
          <div class="diamond"></div>
        </div>
        <p>正在加载，请稍候...</p>
      </div>
    </div>

    <header class="background-container">
      <img id="header-img" :src="headerLogoSrc" alt="ST" />
      <h2 class="h2-container">发货通知单台账 · 审核</h2>
      <FeedbackButton />
    </header>

    <main class="container">
      <div class="container-fluid px-0">
        <!-- 工具栏 -->
        <div class="card">
          <div class="card-header">
            <i class="bi bi-tools me-2"></i>查询与操作
          </div>
          <div class="card-body">
            <div class="toolbar-row">
              <div class="toolbar-actions">
                <button type="button" class="btn btn-secondary" @click="refreshData">
                  <i class="bi bi-arrow-clockwise me-1"></i>刷新
                </button>
              </div>
              <input
                type="text"
                class="form-control"
                v-model="searchKeyword"
                placeholder="输入发货通知单号、合同号、车号或规格，可模糊查询"
                @keypress.enter="searchData"
              />
              <div class="toolbar-actions">
                <button type="button" class="btn btn-primary" @click="searchData">
                  <i class="bi bi-search me-1"></i>查询
                </button>
                <button type="button" class="btn btn-secondary" @click="clearSearch">
                  <i class="bi bi-x-circle me-1"></i>清除
                </button>
              </div>
              <span class="text-muted" v-if="searchResultHint">{{ searchResultHint }}</span>
            </div>
          </div>
        </div>

        <!-- 数据表格 -->
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <i class="bi bi-card-checklist me-2"></i>数据列表
            </div>
            <div>
              <span class="badge bg-primary">{{ currentData.length }}</span> 条记录
            </div>
          </div>

          <!-- 批量操作栏 -->
          <div class="batch-actions d-flex" v-if="currentData.length > 0">
            <div class="d-flex justify-content-between align-items-center w-100">
              <div class="batch-info">
                <span>已选择 <span class="batch-count">{{ selectedItems.size }}</span> 条</span>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-success btn-sm" :disabled="selectedItems.size === 0" @click="batchAudit(true)">
                  <i class="bi bi-check2-all me-1"></i>批量审核
                </button>
              </div>
            </div>
          </div>

          <div class="card-body p-0">
            <div class="table-container">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th scope="col" width="50">
                      <input type="checkbox" class="form-check-input" @change="toggleAll" ref="checkAllRef" />
                    </th>
                    <th
                      v-for="col in displayCols"
                      :key="col.key"
                      :data-sort="col.sortable ? col.key : undefined"
                      @click="col.sortable && sortBy(col.key)"
                    >
                      {{ col.label }}
                      <i v-if="col.sortable && sortField === col.key" class="bi ms-1" :class="sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'"></i>
                      <i v-else-if="col.sortable" class="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>
                    </th>
                    <th scope="col" width="220">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="currentData.length === 0">
                    <td :colspan="displayCols.length + 2" class="empty-state">
                      <i class="bi bi-inbox"></i>
                      <p class="mb-0">暂无数据</p>
                      <small>请点击"刷新"按钮加载数据</small>
                    </td>
                  </tr>
                  <tr
                    v-for="(row, idx) in pageData"
                    :key="row['发货通知单号'] + '_' + idx"
                    class="selectable"
                    :class="{ selected: selectedItems.has(rowKey(row, idx)), audited: row['审核状态'] === '已审核' }"
                    @click="toggleRow(row, idx, $event)"
                  >
                    <td>
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :checked="selectedItems.has(rowKey(row, idx))"
                        :disabled="row['审核状态'] === '已审核'"
                        @click.stop
                        @change="toggleRow(row, idx)"
                      />
                    </td>
                    <td v-for="col in displayCols" :key="col.key" :title="row[col.key] || ''">
                      <span v-if="col.key === '审核状态'" :class="['status-badge', row[col.key] === '已审核' ? 'status-audited' : 'status-unaudited']">{{ row[col.key] || '未审核' }}</span>
                      <template v-else>{{ row[col.key] || '' }}</template>
                    </td>
                    <td>
                      <div class="action-btns">
                        <button class="action-btn action-btn-edit" @click.stop="showDetail(row)" title="查看详情">
                          <i class="bi bi-eye"></i><span>详情</span>
                        </button>
                        <button class="btn btn-success btn-sm" @click.stop="handleAudit(row['发货通知单号'], true)" :disabled="row['审核状态'] === '已审核'" :title="row['审核状态'] === '已审核' ? '已审核' : '审核通过'">
                          <i class="bi bi-check-circle me-1"></i>{{ row['审核状态'] === '已审核' ? '已审核' : '通过' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            :total="currentData.length"
            v-model:currentPage="currentPage"
            v-model:pageSize="pageSize"
          />
        </div>
      </div>
    </main>

    <!-- 详情弹窗（只读） -->
    <div class="modal fade" ref="detailModalRef" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h4 class="modal-title">
              <i class="bi bi-eye me-2"></i>查看详情
            </h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-for="section in sections" :key="section.title">
              <h6 class="form-section-title">
                <i :class="'bi ' + section.icon + ' me-1'"></i>{{ section.title }}
              </h6>
              <div class="modal-form-row">
                <div v-for="field in section.fields" :key="field.key" :class="field.col" class="modal-form-col">
                  <label class="form-label">{{ field.key }}</label>
                  <input type="text" class="form-control" :value="detailData[field.key] || ''" readonly />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, watch } from 'vue'
import { Modal } from 'bootstrap'
import { DISPLAY_COLS, FORM_SECTIONS } from '@/utils/constants'
import { useDataTable } from '@/composables/useDataTable'
import PaginationBar from '@/components/PaginationBar.vue'
import FeedbackButton from '@/components/FeedbackButton.vue'
import { fetchDataFromAPI } from '@/api'

const headerLogoSrc = '/program/logo/font_logo.png'

const hasPermission = ref(false)
const checking = ref(true)
const displayCols = DISPLAY_COLS
const sections = FORM_SECTIONS

const {
  currentData, selectedItems, currentPage, pageSize, sortField, sortDirection,
  searchKeyword, loading, pageData,
  refreshData, sortBy, findRowByKey,
  deleteRecord, batchDeleteRecords,
  auditRecord, batchAuditRecords
} = useDataTable()

const toastRef = inject('toast')
const detailModalRef = ref(null)
const checkAllRef = ref(null)
const detailData = reactive({})
const searchResultHint = ref('')
let detailModalInstance = null

function showMsg(msg, isError = false) {
  toastRef.value?.show(msg, isError ? 'error' : 'success')
}

function rowKey(row, idx) {
  return 'row_' + idx
}

function toggleRow(row, idx, event) {
  if (row['审核状态'] === '已审核') return
  if (event && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) return
  const key = rowKey(row, idx)
  const newSet = new Set(selectedItems.value)
  if (newSet.has(key)) {
    newSet.delete(key)
  } else {
    newSet.add(key)
  }
  selectedItems.value = newSet
}

function toggleAll(event) {
  const checked = event.target.checked
  const newSet = new Set()
  if (checked) {
    pageData.value.forEach((row, idx) => {
      if (row['审核状态'] !== '已审核') {
        newSet.add(rowKey(row, idx))
      }
    })
  }
  selectedItems.value = newSet
}

// 同步全选 checkbox 状态（只统计未审核行）
watch([pageData, selectedItems], () => {
  if (!checkAllRef.value) return
  const selectable = pageData.value.filter(r => r['审核状态'] !== '已审核')
  const allChecked = selectable.length > 0 && selectable.every((r, i) => selectedItems.value.has(rowKey(r, i)))
  const someChecked = selectable.some((r, i) => selectedItems.value.has(rowKey(r, i)))
  checkAllRef.value.checked = allChecked
  checkAllRef.value.indeterminate = !allChecked && someChecked
})

function showDetail(row) {
  Object.keys(detailData).forEach(k => delete detailData[k])
  Object.assign(detailData, row)
  if (!detailModalInstance) {
    detailModalInstance = new Modal(detailModalRef.value)
  }
  detailModalInstance.show()
}

async function handleAudit(key, approved) {
  loading.value = true
  try {
    const res = await auditRecord(key, approved)
    if (res.success) {
      showMsg(res.msg)
      await refreshData()
    } else {
      showMsg(res.msg, true)
    }
  } finally {
    loading.value = false
  }
}

async function batchAudit(approved) {
  if (selectedItems.value.size === 0) {
    showMsg('请先勾选要操作的记录', true)
    return
  }

  const keys = []
  const rows = pageData.value
  selectedItems.value.forEach(key => {
    for (let i = 0; i < rows.length; i++) {
      if (rowKey(rows[i], i) === key && rows[i]['发货通知单号'] && rows[i]['审核状态'] !== '已审核') {
        keys.push(rows[i]['发货通知单号'])
        break
      }
    }
  })

  if (keys.length === 0) {
    showMsg('所选记录均已审核，无需重复操作', true)
    return
  }

  const actionName = approved ? '审核通过' : '拒绝'
  if (!confirm('确认' + actionName + ' ' + keys.length + ' 条记录？（已跳过 ' + (selectedItems.value.size - keys.length) + ' 条已审核记录）')) return

  loading.value = true
  try {
    const res = await batchAuditRecords(keys, approved)
    if (res.success) {
      showMsg(res.msg)
      selectedItems.value = new Set()
      if (checkAllRef.value) checkAllRef.value.checked = false
      await refreshData()
    } else {
      showMsg(res.msg, true)
    }
  } finally {
    loading.value = false
  }
}

function searchData() {
  searchResultHint.value = ''
  refreshData().then(() => {
    searchResultHint.value = '找到 ' + currentData.value.length + ' 条'
  })
}

function clearSearch() {
  searchKeyword.value = ''
  searchResultHint.value = ''
  refreshData()
}

async function checkPermission() {
  try {
    const response = await fetchDataFromAPI('802', { action: 'checkPermission', page: 'audit' })
    if (response.data && response.data.data && response.data.data.hasPermission) {
      hasPermission.value = true
    }
  } catch (e) {
    // 失败默认无权限
  } finally {
    checking.value = false
  }
}

onMounted(() => {
  checkPermission().then(() => {
    if (hasPermission.value) {
      refreshData()
    }
  })
})
</script>
