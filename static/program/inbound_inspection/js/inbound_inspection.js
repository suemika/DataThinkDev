/**
 * 石灰粉进厂车辆随机抽检 - 业务逻辑脚本
 */

// --- 全局变量 ---
let currentData = [];
let selectedItems = new Set();

// --- 核心功能函数 ---

/**
 * 更新批量操作栏显示 (计数及全选框状态)
 */
function updateBatchActions() {
    const selectedCountSpan = document.getElementById('selectedCount');
    if (!selectedCountSpan) return;

    selectedCountSpan.textContent = selectedItems.size;

    // 获取所有可选择（未禁用）的复选框
    const checkboxes = document.querySelectorAll('.item-checkbox:not(:disabled)');
    const totalSelectable = checkboxes.length;

    // 计算已选中的可选择项数量
    let selectedSelectableCount = 0;
    checkboxes.forEach(cb => {
        const index = parseInt(cb.dataset.index);
        if (selectedItems.has(index)) selectedSelectableCount++;
    });

    const headerCheckbox = document.getElementById('headerCheckbox');
    const checkAll = document.getElementById('checkAll');

    if (totalSelectable === 0) {
        [headerCheckbox, checkAll].forEach(el => {
            if (el) {
                el.checked = false;
                el.indeterminate = false;
                el.disabled = true;
            }
        });
    } else {
        [headerCheckbox, checkAll].forEach(el => {
            if (el) {
                el.disabled = false;
                if (selectedSelectableCount === totalSelectable) {
                    el.checked = true;
                    el.indeterminate = false;
                } else if (selectedSelectableCount > 0 && selectedSelectableCount < totalSelectable) {
                    el.checked = false;
                    el.indeterminate = true;
                } else {
                    el.checked = false;
                    el.indeterminate = false;
                }
            }
        });
    }
}

/**
 * 切换单行选择状态
 */
function toggleRowSelection(row, index, checkbox) {
    if (checkbox && checkbox.disabled) return;

    const isSelected = selectedItems.has(index);

    if (isSelected) {
        selectedItems.delete(index);
        row.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
    } else {
        selectedItems.add(index);
        row.classList.add('selected');
        if (checkbox) checkbox.checked = true;
    }

    updateBatchActions();
}

/**
 * 页面初始化 - 现在文本框只需要设置默认值
 */
function initSelectOptions() {
    // 修改1: 物料名称文本框设置默认值
    const materialInput = document.getElementById('materialName');
    if (materialInput) {
        materialInput.value = ""; // 清空默认值
        materialInput.placeholder = "请输入物料名称"; // 保持提示文本
    }

    // 修改2: 卸车仓库文本框设置默认值
    const warehouseInput = document.getElementById('warehouse');
    if (warehouseInput) {
        warehouseInput.value = ""; // 清空默认值
        warehouseInput.placeholder = "请输入卸车位置"; // 保持提示文本
    }
}

/**
 * 全选或取消全选
 * @param {boolean} isChecked
 */
function toggleAllSelection(isChecked) {
    const checkboxes = document.querySelectorAll('.item-checkbox:not(:disabled)');

    checkboxes.forEach(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        const row = checkbox.closest('tr'); // 优化：直接查找父级行

        if (isChecked) {
            selectedItems.add(index);
            checkbox.checked = true;
            if (row) row.classList.add('selected');
        } else {
            selectedItems.delete(index);
            checkbox.checked = false;
            if (row) row.classList.remove('selected');
        }
    });

    updateBatchActions();
}

/**
 * 渲染表格数据
 */
function renderTableData(data) {
    currentData = data || [];
    selectedItems.clear();

    const tableBody = document.getElementById('inspectionTableBody');
    const resultCount = document.getElementById('resultCount');
    if (resultCount) resultCount.textContent = data.length;

    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr id="emptyStateRow">
                <td colspan="9" class="empty-state">
                    <i class="bi bi-clipboard-check"></i>
                    <p class="mb-0">暂无抽检数据</p>
                    <small>根据当前参数未查询到符合条件的车辆</small>
                </td>
            </tr>
        `;
        updateBatchActions();
        return;
    }

    tableBody.innerHTML = '';

    data.forEach((item, index) => {
        const order_no = item.order_no || '';
        const supplier = item.supplier || '';
        const material = item.material || '';
        const inspectionTime = item.inspectionTime || '';
        const plateNumber = item.plateNumber || '';
        const warehouse = item.warehouse || '';

        let status = item.status || '待检';
        const isCompleted = (status === '已完成' || status === 'completed' || status === '1' || status === '已检');
        const statusText = isCompleted ? '已完成' : '待检';
        const statusClass = statusText === '已完成' ? 'status-completed' : 'status-pending';
        const isSelectable = !isCompleted;

        const itemId = `item-${index}-${Date.now()}`;
        const row = document.createElement('tr');
        row.className = isSelectable ? 'selectable' : '';
        row.dataset.index = index;

        row.innerHTML = `
                        <td class="checkbox-container" data-label="选择">
                            <input type="checkbox" class="form-check-input item-checkbox" id="${itemId}" 
                                   data-index="${index}" ${isCompleted ? 'disabled' : ''}>
                        </td>
                        <th scope="row" data-label="序号">${index + 1}</th>
                        <td data-label="供应商名称">${supplier}</td>
                        <td data-label="物料名称">${material}</td>
                        <td data-label="一检时间">${formatDateTime(inspectionTime)}</td>
                        <td data-label="车号"><span class="badge bg-secondary">${plateNumber}</span></td>
                        <td data-label="卸车料场">${warehouse}</td>
                        <td data-label="单据编号">${order_no}</td>
                        <td data-label="抽检状态"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    `;

        tableBody.appendChild(row);

        const checkbox = document.getElementById(itemId);
        if (checkbox) {
            checkbox.addEventListener('click', (e) => e.stopPropagation());
            checkbox.addEventListener('change', function (e) {
                e.stopPropagation();
                toggleRowSelection(row, index, this);
            });
        }

        if (isSelectable) {
            row.addEventListener('click', function (e) {
                if (e.target.type === 'checkbox' || e.target.closest('.checkbox-container')) return;
                toggleRowSelection(row, index, checkbox);
            });
        }
    });

    updateBatchActions();
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return dateTimeStr;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
        return dateTimeStr;
    }
}

/**
 * 提交查询 (调用接口 796)
 */
async function submitData() {
    const checkCountEl = document.getElementById('checkCount');
    const checkCount = parseInt(checkCountEl ? checkCountEl.value : 0);
    const materialName = document.getElementById('materialName').value;
    const warehouse = document.getElementById('warehouse').value;

    if (!checkCount || checkCount < 1 || checkCount > 50) {
        showMsg('抽查车数必须在1-50之间',true);
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    const tableBody = document.getElementById('inspectionTableBody');

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>查询中...';
        }

        if (tableBody) {
            tableBody.innerHTML = `
                <tr id="loadingRow">
                    <td colspan="9" class="empty-state">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <p class="mb-0 mt-2">正在查询数据，请稍候...</p>
                    </td>
                </tr>
            `;
        }

        // 调用 util_link.js 中定义的 fetchDataFromAPI
        const params = {
            checkCount: checkCount,
            material: materialName || '',
            warehouse: warehouse || ''
        };

        const response = await fetchDataFromAPI('796', params);

        if (response && response.data.status === 0) {
            document.getElementById('userName').textContent = response.data.userName
            renderTableData(response.data.data || []);
        } else {
            showMsg(response.data.msg, true)
            renderTableData([]);
        }
    } catch (error) {
        console.error('796查询失败:', error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state text-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        <p class="mb-0">数据加载失败</p>
                        <small>${error.message || '请检查网络或接口配置'}</small>
                    </td>
                </tr>
            `;
        }
        const resultCount = document.getElementById('resultCount');
        if (resultCount) resultCount.textContent = '0';
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-search me-1"></i>开始随机抽检';
        }
    }
}

/**
 * 确认抽检保存 (调用接口 797)
 */
async function confirmInspection() {
    if (selectedItems.size === 0) {
        showMsg('请先选择要确认抽检的车辆', true);
        return;
    }

    const selectedIndexes = Array.from(selectedItems).sort((a, b) => b - a); // 降序排列，方便删除
    const selectedVehicles = selectedIndexes.map(index => {
        const item = currentData[index];
        return {
            order_no: item.order_no,
            plateNumber: item.plateNumber,
            materialcode: item.goods_code,
            material: item.material,
            supplier: item.supplier,
            inspectionTime: item.inspectionTime,
            warehouse: item.warehouse,
            status: '已完成'
        };
    });

    if (!confirm(`确认将选中的 ${selectedItems.size} 辆车标记为"已抽检"并保存吗？`)) {
        return;
    }

    const confirmBtn = document.getElementById('confirmCheckBtn');
    try {
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>保存中...';
        }

        const response = await fetchDataFromAPI('797', { items: selectedVehicles });

        if (response && response.data.status === 0) {
            showMsg(`成功保存 ${selectedVehicles.length} 辆车`);

            // --- 新增：从 currentData 中删除已保存的数据 ---
            // 按索引降序删除，避免数组索引变化导致删除错误
            selectedIndexes.forEach(index => {
                currentData.splice(index, 1);
            });

            // 清空选择集
            selectedItems.clear();

            // 重新渲染表格
            renderTableData(currentData);

        } else {
            throw new Error(response?.message || '保存失败');
        }
    } catch (error) {
        console.error('797保存失败:', error);
        showMsg('保存失败：' + error.message, true);
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>确认抽检选中车辆';
        }
    }
}

// --- 事件监听初始化 ---

document.addEventListener('DOMContentLoaded', function () {

    initSelectOptions();

    // 1. 设置默认抽查数
    const checkCountInput = document.getElementById('checkCount');
    if (checkCountInput) checkCountInput.value = 1;

    // 2. 查询按钮
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function (e) {
            e.preventDefault();
            submitData();
        });
    }

    // 3. 重置按钮
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            document.getElementById('inspectionForm').reset();
            if (checkCountInput) checkCountInput.value = 1;
            selectedItems.clear();
            const tableBody = document.getElementById('inspectionTableBody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr id="emptyStateRow">
                        <td colspan="9" class="empty-state">
                            <i class="bi bi-clipboard-check"></i>
                            <p class="mb-0">暂无抽检数据</p>
                            <small>请设置抽检参数并点击"开始随机抽检"按钮</small>
                        </td>
                    </tr>
                `;
            }
            const resultCount = document.getElementById('resultCount');
            if (resultCount) resultCount.textContent = '0';
            updateBatchActions();
        });
    }

    // 4. 全选功能 (表头和批量栏)
    const headerCheckbox = document.getElementById('headerCheckbox');
    if (headerCheckbox) {
        headerCheckbox.addEventListener('change', function () {
            toggleAllSelection(this.checked);
        });
    }

    const checkAll = document.getElementById('checkAll');
    if (checkAll) {
        checkAll.addEventListener('change', function () {
            toggleAllSelection(this.checked);
        });
    }

    // 5. 确认抽检按钮
    const confirmBtn = document.getElementById('confirmCheckBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmInspection);
    }

    // 6. 输入框回车快捷键
    if (checkCountInput) {
        checkCountInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitData();
            }
        });
    }
});