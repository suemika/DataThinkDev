import { ref, computed } from 'vue'
import { fetchDataFromAPI } from '@/api'

export function useDataTable(extraQueryParams = {}) {
  const currentData = ref([])
  const selectedItems = ref(new Set())
  const currentPage = ref(1)
  const pageSize = ref(50)
  const sortField = ref('发货通知单号')
  const sortDirection = ref('desc')
  const searchKeyword = ref('')
  const loading = ref(false)
  const error = ref('')

  const totalPages = computed(() => Math.ceil(currentData.value.length / pageSize.value) || 1)

  const pageData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return currentData.value.slice(start, end)
  })

  async function refreshData() {
    loading.value = true
    error.value = ''
    try {
      const params = {
        action: 'query',
        keyword: searchKeyword.value || '',
        sortField: sortField.value || '发货通知单号',
        sortDirection: sortDirection.value
      }
      // 合并额外参数（如 page: 'index' 用于服务端过滤）
      Object.assign(params, extraQueryParams)
      const response = await fetchDataFromAPI('802', params)
      if (response.data && response.data.status === 0) {
        const data = response.data.data || []
        data.sort((a, b) => {
          const aAudited = a['审核状态'] === '已审核' ? 1 : 0
          const bAudited = b['审核状态'] === '已审核' ? 1 : 0
          return aAudited - bAudited
        })
        currentData.value = data
      } else {
        error.value = response.data?.msg || '查询失败'
        currentData.value = []
      }
      currentPage.value = 1
      selectedItems.value = new Set()
    } catch (e) {
      error.value = '查询失败：' + (e.message || '网络异常')
      currentData.value = []
    } finally {
      loading.value = false
    }
  }

  function sortBy(field) {
    if (sortField.value === field) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortDirection.value = 'asc'
    }
    const dir = sortDirection.value
    currentData.value.sort((a, b) => {
      let va = (a[field] || '').toString()
      let vb = (b[field] || '').toString()
      const na = parseFloat(va), nb = parseFloat(vb)
      if (!isNaN(na) && !isNaN(nb)) {
        return dir === 'asc' ? na - nb : nb - na
      }
      return dir === 'asc' ? va.localeCompare(vb, 'zh-CN') : vb.localeCompare(va, 'zh-CN')
    })
    currentPage.value = 1
  }

  function findRowByKey(key) {
    return currentData.value.find(row => (row['发货通知单号'] || row['ID'] || '') === key) || null
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
  }

  async function deleteRecord(key) {
    const response = await fetchDataFromAPI('802', { action: 'delete', key })
    if (response.data && response.data.status === 0) {
      return { success: true, msg: response.data.msg || '删除成功' }
    }
    return { success: false, msg: response.data?.msg || '删除失败' }
  }

  async function batchDeleteRecords(keys) {
    const response = await fetchDataFromAPI('802', { action: 'batchDelete', keys })
    if (response.data && response.data.status === 0) {
      return { success: true, msg: response.data.msg || '批量删除成功' }
    }
    return { success: false, msg: response.data?.msg || '批量删除失败' }
  }

  async function saveRecord(mode, formData, originalKey) {
    // 单号重复检查
    const newKey = formData['发货通知单号']
    if (newKey) {
      const duplicate = currentData.value.find(row => {
        const rowKey = row['发货通知单号'] || ''
        if (mode === 'edit' && rowKey === originalKey) {
          return false
        }
        return rowKey === newKey
      })
      if (duplicate) {
        return { success: false, msg: '发货通知单号「' + newKey + '」已存在，请勿重复添加' }
      }
    }

    let params
    if (mode === 'add') {
      params = { action: 'insert', data: { ...formData } }
    } else {
      params = { action: 'update', key: originalKey, data: { ...formData } }
    }
    const response = await fetchDataFromAPI('802', params)
    if (response.data && response.data.status === 0) {
      return { success: true, msg: response.data.msg || '操作成功' }
    }
    return { success: false, msg: response.data?.msg || '操作失败' }
  }

  async function copyRecord(key, operatorName = '') {
    const row = findRowByKey(key)
    if (!row) return { success: false, msg: '未找到该记录' }
    const copiedData = { ...row }
    delete copiedData['审核状态']
    delete copiedData['更新时间']
    delete copiedData['审核人']
    delete copiedData['审核时间']
    // 复制时自动填入当前操作人和时间，后端 _insert 见 key 已存在则不再覆盖
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    copiedData['操作人'] = operatorName
    copiedData['操作时间'] = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const baseName = copiedData['发货通知单号'] || ''
    let copyName = baseName + '-副本'
    let counter = 1
    while (currentData.value.some(r => (r['发货通知单号'] || '') === copyName)) {
      counter++
      copyName = baseName + '-副本' + counter
    }
    copiedData['发货通知单号'] = copyName
    const response = await fetchDataFromAPI('802', { action: 'insert', data: copiedData })
    if (response.data && response.data.status === 0) {
      currentData.value.unshift(copiedData)
      currentPage.value = 1
      return { success: true, msg: '复制成功' }
    }
    return { success: false, msg: response.data?.msg || '复制失败' }
  }

  async function auditRecord(key, approved) {
    const response = await fetchDataFromAPI('802', {
      action: 'audit',
      key,
      approved: approved ? 1 : 0
    })
    if (response.data && response.data.status === 0) {
      return { success: true, msg: response.data.msg || (approved ? '审核通过' : '已拒绝') }
    }
    return { success: false, msg: response.data?.msg || '审核操作失败' }
  }

  async function batchAuditRecords(keys, approved) {
    const response = await fetchDataFromAPI('802', {
      action: 'batchAudit',
      keys,
      approved: approved ? 1 : 0
    })
    if (response.data && response.data.status === 0) {
      return { success: true, msg: response.data.msg || '批量审核成功' }
    }
    return { success: false, msg: response.data?.msg || '批量审核失败' }
  }

  return {
    currentData, selectedItems, currentPage, pageSize, sortField, sortDirection,
    searchKeyword, loading, error, totalPages, pageData,
    refreshData, sortBy, findRowByKey, goToPage,
    deleteRecord, batchDeleteRecords, saveRecord, copyRecord,
    auditRecord, batchAuditRecords
  }
}
