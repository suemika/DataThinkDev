/**
 * 发货通知单台账 - 业务逻辑
 * 功能代号: 802  数据表: IMES_PES2.T_SH_ZBS_FHTZTP
 * 所有操作统一走 fetchDataFromAPI('802', {action: 'xxx', ...})
 */

// --- 全局状态 ---
let currentData = [];
let selectedItems = new Set();
let currentPage = 1;
let pageSize = 50;
let sortField = '';
let sortDirection = 'asc';
let currentFilter = '';
let auditTargetKey = null;
let deleteTargetKey = null;
let hasPermission = false;  // 后台权限：true=可删除/审核

// --- 显示列配置 ---
const DISPLAY_COLS = [
    { key: '发货通知单号', label: '发货通知单号', sortable: true },
    { key: '合同号', label: '合同号', sortable: true },
    { key: '批号', label: '批号', sortable: true },
    { key: '规格', label: '规格', sortable: true },
    { key: '牌号', label: '牌号', sortable: true },
    { key: '产品名称1', label: '产品名称', sortable: true },
    { key: '收货单位', label: '收货单位', sortable: true },
    { key: '车号', label: '车号', sortable: true },
    { key: '重量', label: '重量', sortable: true },
    { key: '日期', label: '日期', sortable: true },
    { key: '审核状态', label: '审核状态', sortable: true }
];

// --- 编辑弹窗中所有字段 ---
const FORM_FIELDS = [
    '发货通知单号', '合同号', '收货单位', '车号', '日期', '请发日期',
    '批号', '规格', '定尺', '产品名称1', '牌号', '执行标准', '炉号',
    '重量', '支数', '件数', '总重量', '总件数', '米重',
    '各支理重', '各支实重', '各支件数',
    '屈服强度', '抗拉强度', '强屈比', '断后伸长率', '最大应力下的总伸长率', '超强比',
    '下屈服强度', '断面收缩率', '试样尺寸', '冷弯180度', '反弯', '弯曲类型',
    '冲击功1', '冲击功2', '冲击功3', '冲击功平均值', '冲击功', 'D类型', '试验温度',
    'C', 'MN', 'P', 'S', 'SI', 'CU', 'NI', 'CR', 'MO', 'V', 'B', 'N',
    'ALT', 'TI', 'NB', 'ALS', 'CEQ', 'CMN6', 'CE', '技术规范', '实物标记'
];

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('loading-overlay').style.display = 'flex';

    setTimeout(() => {
        if (typeof util !== 'undefined' && util.loading && typeof util.loading.show === 'function') {
            util.loading.show();
        }
        // 先获取用户权限，再加载数据
        fetchUserInfo().then(() => refreshData());
    }, 100);

    // 搜索框回车
    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') searchData();
        });
    }

    // 全选（批量操作栏）
    const checkAll = document.getElementById('checkAll');
    if (checkAll) {
        checkAll.addEventListener('change', function () {
            toggleAllSelection(this.checked);
        });
    }

    // 每页条数
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function () {
            pageSize = parseInt(this.value);
            currentPage = 1;
            renderTable();
            renderPagination();
        });
    }

    // 按钮事件
    document.getElementById('addBtn')?.addEventListener('click', showAddModal);
    document.getElementById('refreshBtn')?.addEventListener('click', refreshData);
    document.getElementById('searchBtn')?.addEventListener('click', searchData);
    document.getElementById('clearBtn')?.addEventListener('click', clearSearch);
    document.getElementById('saveBtn')?.addEventListener('click', submitForm);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('confirmAuditBtn')?.addEventListener('click', confirmAudit);
    document.getElementById('batchDeleteBtn')?.addEventListener('click', batchDelete);
    document.getElementById('batchAuditBtn')?.addEventListener('click', batchAudit);
});

// ==================== 获取当前用户权限 ====================
async function fetchUserInfo() {
    try {
        const response = await fetchDataFromAPI('802', { action: 'getUserInfo' });
        if (response && response.data && response.data.status === 0) {
            hasPermission = response.data.data.hasPermission === true;
        }
    } catch (error) {
        console.error('获取用户权限失败:', error);
    }
}

// ==================== 数据查询 (action: query) ====================
async function refreshData() {
    showLoading();
    try {
        const params = {
            action: 'query',
            keyword: document.getElementById('search-box').value.trim() || '',
            sortField: sortField || '发货通知单号',
            sortDirection: sortDirection
        };

        const response = await fetchDataFromAPI('802', params);

        if (response && response.data && response.data.status === 0) {
            currentData = response.data.data || [];
        } else {
            showMsg(response?.data?.msg || '查询失败', true);
            currentData = [];
        }

        currentPage = 1;
        selectedItems.clear();
        renderTable();
        renderPagination();
    } catch (error) {
        console.error('查询失败:', error);
        showMsg('查询失败：' + (error.message || '请检查网络连接'), true);
    } finally {
        hideLoading();
    }
}

function searchData() {
    const input = document.getElementById('search-box').value.trim();
    currentFilter = input;

    // 客户端二次过滤（服务端已按 keyword 查过，这里做更细的过滤）
    refreshData().then(() => {
        const kw = input.toLowerCase().replace(/\s+/g, '');
        if (kw && currentData.length > 0) {
            const filtered = currentData.filter(row => {
                const searchFields = ['发货通知单号', '合同号', '车号', '规格', '收货单位'];
                return searchFields.some(f => {
                    const val = (row[f] || '').toString().toLowerCase().replace(/\s+/g, '');
                    return val.includes(kw);
                });
            });
            if (filtered.length < currentData.length) {
                currentData = filtered;
                currentPage = 1;
                renderTable();
                renderPagination();
            }
            const hint = document.getElementById('search-result-hint');
            if (hint) hint.textContent = '找到 ' + currentData.length + ' 条';
        }
    });
}

function clearSearch() {
    document.getElementById('search-box').value = '';
    currentFilter = '';
    const hint = document.getElementById('search-result-hint');
    if (hint) hint.textContent = '';
    refreshData();
}

// ==================== 表格渲染 ====================
function renderTable() {
    const tbody = document.getElementById('table-body');
    const emptyState = document.getElementById('empty-state-row');
    const paginationWrapper = document.querySelector('.pagination-wrapper');
    const batchActions = document.getElementById('batchActions');
    const resultCount = document.getElementById('resultCount');

    if (resultCount) resultCount.textContent = currentData.length;

    if (currentData.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = '';
        if (paginationWrapper) paginationWrapper.style.display = 'none';
        if (batchActions) batchActions.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (paginationWrapper) paginationWrapper.style.display = 'flex';
    if (batchActions) batchActions.style.display = 'flex';

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, currentData.length);
    const pageData = currentData.slice(start, end);

    tbody.innerHTML = '';

    pageData.forEach((row, idx) => {
        const globalIdx = start + idx;
        const originalKey = row['发货通知单号'] || '';
        const uniqueKey = 'row_' + globalIdx;  // 纯索引，确保唯一

        const isAudited = row['审核状态'] === '已审核';

        const tr = document.createElement('tr');
        tr.className = 'selectable' + (selectedItems.has(uniqueKey) ? ' selected' : '') + (isAudited ? ' audited' : '');
        tr.dataset.key = uniqueKey;
        tr.dataset.index = globalIdx;

        let cellsHtml = '';
        cellsHtml += '<td class="checkbox-container" data-label="选择">' +
            '<input type="checkbox" class="form-check-input item-checkbox"' +
            ' data-key="' + uniqueKey + '"' +
            ' data-original-key="' + escapeHtml(originalKey) + '"' +
            (isAudited ? ' disabled' : '') +
            (selectedItems.has(uniqueKey) ? ' checked' : '') + '></td>';

        DISPLAY_COLS.forEach(col => {
            const val = row[col.key] || '';
            cellsHtml += '<td data-label="' + col.label + '" title="' + escapeHtml(val) + '">' + escapeHtml(val) + '</td>';
        });

        // 操作列 — 按钮仍用原始 key 查找数据
        let actionBtns = '<button type="button" class="action-btn action-btn-edit edit-btn" data-key="' + escapeHtml(originalKey) + '"' +
            (isAudited ? ' disabled title="已审核，不可编辑"' : '') + '>' +
            '<i class="bi bi-pencil-square"></i><span>编辑</span></button>' +
            '<button type="button" class="action-btn action-btn-copy copy-btn" data-key="' + escapeHtml(originalKey) + '">' +
            '<i class="bi bi-copy"></i><span>复制</span></button>';

        cellsHtml += '<td data-label="操作"><div class="action-btns">' + actionBtns + '</div></td>';

        tr.innerHTML = cellsHtml;
        tbody.appendChild(tr);

        // 行点击切换选择（已审核行不可选）
        tr.addEventListener('click', function (e) {
            if (isAudited) return;
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') ||
                e.target.tagName === 'INPUT' || e.target.closest('.checkbox-container')) return;
            toggleRowSelection(tr, uniqueKey, tr.querySelector('.item-checkbox'));
        });
    });

    // 绑定复选框
    tbody.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('click', function (e) { e.stopPropagation(); });
        cb.addEventListener('change', function () {
            toggleRowSelection(this.closest('tr'), this.dataset.key, this);
        });
    });

    // 绑定操作按钮
    tbody.querySelectorAll('.edit-btn').forEach(btn =>
        btn.addEventListener('click', function (e) { e.stopPropagation(); showEditModal(this.dataset.key); }));
    tbody.querySelectorAll('.copy-btn').forEach(btn =>
        btn.addEventListener('click', function (e) { e.stopPropagation(); copyRecord(this.dataset.key); }));

    // 表头排序
    document.querySelectorAll('#data-table thead th[data-sort]').forEach(th => {
        th.onclick = function () { sortByField(this.dataset.sort); };
    });

    updateBatchActions();
}

// ==================== 选择逻辑 ====================
function toggleRowSelection(row, key, checkbox) {
    if (selectedItems.has(key)) {
        selectedItems.delete(key);
        row.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
    } else {
        selectedItems.add(key);
        row.classList.add('selected');
        if (checkbox) checkbox.checked = true;
    }
    updateBatchActions();
}

function toggleAllSelection(isChecked) {
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        if (cb.disabled) return;  // 已审核行不可选
        const key = cb.dataset.key;
        const row = cb.closest('tr');
        if (isChecked) {
            selectedItems.add(key);
            cb.checked = true;
            if (row) row.classList.add('selected');
        } else {
            selectedItems.delete(key);
            cb.checked = false;
            if (row) row.classList.remove('selected');
        }
    });
    updateBatchActions();
}

function updateBatchActions() {
    const selectedCountSpan = document.getElementById('selectedCount');
    if (selectedCountSpan) selectedCountSpan.textContent = selectedItems.size;

    // 批量按钮状态
    const batchBtns = document.getElementById('batchBtns');
    if (batchBtns && hasPermission) {
        batchBtns.style.display = 'flex';
        const hasSelection = selectedItems.size > 0;
        document.getElementById('batchDeleteBtn').disabled = !hasSelection;
        document.getElementById('batchAuditBtn').disabled = !hasSelection;
    }

    const checkboxes = document.querySelectorAll('.item-checkbox');
    let totalSelectable = 0;

    let selectedSelectableCount = 0;
    checkboxes.forEach(cb => {
        if (cb.disabled) return;  // 已审核行不计入可选数量
        totalSelectable++;
        if (selectedItems.has(cb.dataset.key)) selectedSelectableCount++;
    });

    const checkAll = document.getElementById('checkAll');

    if (!checkAll) return;

    if (totalSelectable === 0) {
        checkAll.checked = false;
        checkAll.indeterminate = false;
        checkAll.disabled = true;
    } else {
        checkAll.disabled = false;
        if (selectedSelectableCount === totalSelectable) {
            checkAll.checked = true; checkAll.indeterminate = false;
        } else if (selectedSelectableCount > 0) {
            checkAll.checked = false; checkAll.indeterminate = true;
        } else {
            checkAll.checked = false; checkAll.indeterminate = false;
        }
    }
}

// ==================== 排序 (客户端) ====================
function sortByField(field) {
    if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortDirection = 'asc';
    }

    currentData.sort((a, b) => {
        let va = (a[field] || '').toString();
        let vb = (b[field] || '').toString();
        const na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) {
            return sortDirection === 'asc' ? na - nb : nb - na;
        }
        return sortDirection === 'asc'
            ? va.localeCompare(vb, 'zh-CN')
            : vb.localeCompare(va, 'zh-CN');
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

// ==================== 分页 ====================
function renderPagination() {
    const totalPages = Math.ceil(currentData.length / pageSize) || 1;
    document.getElementById('total-count').textContent = currentData.length;
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('total-pages').textContent = totalPages;

    const nav = document.getElementById('pagination-nav');
    let html = '';

    html += '<li class="page-item ' + (currentPage <= 1 ? 'disabled' : '') + '">' +
        '<a class="page-link" onclick="goToPage(' + (currentPage - 1) + ')"><i class="bi bi-chevron-left"></i></a></li>';

    const maxButtons = 7;
    let sp = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let ep = Math.min(totalPages, sp + maxButtons - 1);
    if (ep - sp < maxButtons - 1) sp = Math.max(1, ep - maxButtons + 1);

    if (sp > 1) {
        html += '<li class="page-item"><a class="page-link" onclick="goToPage(1)">1</a></li>';
        if (sp > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }

    for (let i = sp; i <= ep; i++) {
        html += '<li class="page-item ' + (i === currentPage ? 'active' : '') + '">' +
            '<a class="page-link ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</a></li>';
    }

    if (ep < totalPages) {
        if (ep < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += '<li class="page-item"><a class="page-link" onclick="goToPage(' + totalPages + ')">' + totalPages + '</a></li>';
    }

    html += '<li class="page-item ' + (currentPage >= totalPages ? 'disabled' : '') + '">' +
        '<a class="page-link" onclick="goToPage(' + (currentPage + 1) + ')"><i class="bi bi-chevron-right"></i></a></li>';

    nav.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(currentData.length / pageSize) || 1;
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();
    document.getElementById('table-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== 新增/编辑弹窗 ====================
function showAddModal() {
    document.getElementById('edit-mode').value = 'add';
    document.getElementById('edit-original-key').value = '';
    document.getElementById('editModalLabel').innerHTML = '<i class="bi bi-plus-circle me-2"></i>新增发货通知单';
    clearForm();
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

function clearForm() {
    FORM_FIELDS.forEach(f => {
        const el = document.getElementById('edit-' + f);
        if (el) el.value = '';
    });
}

function showEditModal(key) {
    const row = findRowByKey(key);
    if (!row) { showMsg('未找到该记录', true); return; }

    // 已审核记录不允许编辑
    if (row['审核状态'] === '已审核') {
        showMsg('已审核的记录不允许编辑', true);
        return;
    }

    document.getElementById('edit-mode').value = 'edit';
    document.getElementById('edit-original-key').value = key;
    document.getElementById('editModalLabel').innerHTML = '<i class="bi bi-pencil-square me-2"></i>编辑发货通知单';
    fillForm(row);
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

function fillForm(row) {
    FORM_FIELDS.forEach(f => {
        const el = document.getElementById('edit-' + f);
        if (el) el.value = row[f] || '';
    });
}

// ==================== 提交表单 (action: insert / update) ====================
async function submitForm() {
    const mode = document.getElementById('edit-mode').value;
    const formData = {};
    FORM_FIELDS.forEach(f => {
        const el = document.getElementById('edit-' + f);
        if (el) formData[f] = el.value;
    });

    if (!formData['发货通知单号']) {
        showMsg('请输入发货通知单号', true);
        return;
    }

    showLoading();
    try {
        let params;
        if (mode === 'add') {
            params = { action: 'insert', data: formData };
        } else {
            const originalKey = document.getElementById('edit-original-key').value;
            params = { action: 'update', key: originalKey, data: formData };
        }

        const response = await fetchDataFromAPI('802', params);

        if (response && response.data && response.data.status === 0) {
            showMsg(response.data.msg || '操作成功');
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            await refreshData();
        } else {
            showMsg(response?.data?.msg || '操作失败', true);
        }
    } catch (error) {
        console.error('提交失败:', error);
        showMsg('操作失败：' + (error.message || '网络异常'), true);
    } finally {
        hideLoading();
    }
}

// ==================== 审核 (action: audit) ====================
function showAuditModal(key) {
    const row = findRowByKey(key);
    if (!row) return;
    auditTargetKey = key;
    document.getElementById('audit-record-info').textContent =
        '发货通知单号：' + (row['发货通知单号'] || key);
    new bootstrap.Modal(document.getElementById('auditModal')).show();
}

async function confirmAudit() {
    if (!auditTargetKey) return;
    const row = findRowByKey(auditTargetKey);
    if (!row) return;

    showLoading();
    try {
        const response = await fetchDataFromAPI('802', {
            action: 'audit',
            key: auditTargetKey
        });

        if (response && response.data && response.data.status === 0) {
            showMsg(response.data.msg || '审核成功');
            bootstrap.Modal.getInstance(document.getElementById('auditModal')).hide();
            auditTargetKey = null;
            await refreshData();
        } else {
            showMsg(response?.data?.msg || '审核失败', true);
        }
    } catch (error) {
        console.error('审核失败:', error);
        showMsg('审核失败：' + (error.message || '网络异常'), true);
    } finally {
        hideLoading();
    }
}

// ==================== 删除 (action: delete) ====================
function showDeleteModal(key) {
    const row = findRowByKey(key);
    if (!row) return;
    deleteTargetKey = key;
    document.getElementById('delete-record-info').textContent =
        '发货通知单号：' + (row['发货通知单号'] || key);
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function confirmDelete() {
    if (!deleteTargetKey) return;

    showLoading();
    try {
        const response = await fetchDataFromAPI('802', {
            action: 'delete',
            key: deleteTargetKey
        });

        if (response && response.data && response.data.status === 0) {
            showMsg(response.data.msg || '删除成功');
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            selectedItems.delete(deleteTargetKey);
            deleteTargetKey = null;
            await refreshData();
        } else {
            showMsg(response?.data?.msg || '删除失败', true);
        }
    } catch (error) {
        console.error('删除失败:', error);
        showMsg('删除失败：' + (error.message || '网络异常'), true);
    } finally {
        hideLoading();
    }
}

// ==================== 批量删除 ====================
async function batchDelete() {
    if (selectedItems.size === 0) {
        showMsg('请先勾选要删除的记录', true);
        return;
    }
    if (!confirm('确认删除选中的 ' + selectedItems.size + ' 条记录？此操作不可恢复！')) return;

    const keys = [];
    document.querySelectorAll('.item-checkbox:checked').forEach(cb => {
        const k = cb.dataset.originalKey;
        if (k) keys.push(k);
    });
    showLoading();
    try {
        const response = await fetchDataFromAPI('802', { action: 'batchDelete', keys: keys });
        if (response && response.data && response.data.status === 0) {
            showMsg(response.data.msg || '批量删除成功');
            selectedItems.clear();
            await refreshData();
        } else {
            showMsg(response?.data?.msg || '批量删除失败', true);
        }
    } catch (error) {
        console.error('批量删除失败:', error);
        showMsg('批量删除失败：' + (error.message || '网络异常'), true);
    } finally {
        hideLoading();
    }
}

// ==================== 批量审核 ====================
async function batchAudit() {
    if (selectedItems.size === 0) {
        showMsg('请先勾选要审核的记录', true);
        return;
    }
    if (!confirm('确认审核选中的 ' + selectedItems.size + ' 条记录？')) return;

    const keys = [];
    document.querySelectorAll('.item-checkbox:checked').forEach(cb => {
        const k = cb.dataset.originalKey;
        if (k) keys.push(k);
    });
    showLoading();
    try {
        const response = await fetchDataFromAPI('802', { action: 'batchAudit', keys: keys });
        if (response && response.data && response.data.status === 0) {
            showMsg(response.data.msg || '批量审核成功');
            selectedItems.clear();
            await refreshData();
        } else {
            showMsg(response?.data?.msg || '批量审核失败', true);
        }
    } catch (error) {
        console.error('批量审核失败:', error);
        showMsg('批量审核失败：' + (error.message || '网络异常'), true);
    } finally {
        hideLoading();
    }
}

// ==================== 复制 (action: insert) ====================
async function copyRecord(key) {
    const row = findRowByKey(key);
    if (!row) return;

    const copiedData = { ...row };
    // 复制时清除审核状态
    delete copiedData['审核状态'];
    // 自动去重：已有 原单号-副本 则在后面加序号：-副本2、-副本3...
    const baseName = (copiedData['发货通知单号'] || '');
    let copyName = baseName + '-副本';
    let counter = 1;
    while (currentData.some(r => (r['发货通知单号'] || '') === copyName)) {
        counter++;
        copyName = baseName + '-副本' + counter;
    }
    copiedData['发货通知单号'] = copyName;

    try {
        const response = await fetchDataFromAPI('802', {
            action: 'insert',
            data: copiedData
        });

        if (response && response.data && response.data.status === 0) {
            showMsg('复制成功');
            // 不刷新整个页面，直接本地追加新记录
            currentData.unshift(copiedData);
            currentPage = 1;
            renderTable();
            renderPagination();
        } else {
            showMsg(response?.data?.msg || '复制失败', true);
        }
    } catch (error) {
        console.error('复制失败:', error);
        showMsg('复制失败：' + (error.message || '网络异常'), true);
    }
}

// ==================== 工具函数 ====================
function findRowByKey(key) {
    return currentData.find(row => (row['发货通知单号'] || row['ID'] || '') === key) || null;
}

function escapeHtml(str) {
    if (!str) return '';
    str = String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showLoading() {
    if (typeof util !== 'undefined' && util.loading && typeof util.loading.show === 'function') {
        util.loading.show();
    } else {
        document.getElementById('loading-overlay').style.display = 'flex';
    }
}

function hideLoading() {
    if (typeof util !== 'undefined' && util.loading && typeof util.loading.hide === 'function') {
        util.loading.hide();
    } else {
        document.getElementById('loading-overlay').style.display = 'none';
    }
}

// 挂载到全局
window.goToPage = goToPage;
window.showAddModal = showAddModal;
window.showEditModal = showEditModal;
window.submitForm = submitForm;
window.showDeleteModal = showDeleteModal;
window.confirmDelete = confirmDelete;
window.copyRecord = copyRecord;
window.refreshData = refreshData;
window.searchData = searchData;
window.clearSearch = clearSearch;
window.toggleRowSelection = toggleRowSelection;
window.toggleAllSelection = toggleAllSelection;
