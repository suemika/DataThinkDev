const API_BASE = '774';
const insuranceColors = {}; // 保险公司颜色
let currentRecords = []; // 页面当前显示的记录缓存

// 页面加载初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 设置今天日期
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]:not(.no-default-date)');
    dateInputs.forEach(input => {
        if (!input.value) input.value = formattedDate;
    });

    // 创建下拉菜单
    const dropdown = document.createElement("div");
    dropdown.className = "dropdown d-inline-block ms-3";

// 创建下拉按钮
    const dropdownBtn = document.createElement("button");
    dropdownBtn.className = "btn btn-sm btn-success dropdown-toggle";
    dropdownBtn.type = "button";
    dropdownBtn.id = "recordTypeDropdown";
    dropdownBtn.setAttribute("data-bs-toggle", "dropdown");
    dropdownBtn.setAttribute("aria-expanded", "false");
    dropdownBtn.innerHTML = '<i class="bi bi-list"></i> 记录类型';

// 创建下拉菜单项
    const dropdownMenu = document.createElement("ul");
    dropdownMenu.className = "dropdown-menu";
    dropdownMenu.setAttribute("aria-labelledby", "recordTypeDropdown");

// 奶量记录链接
    const milkRecordItem = document.createElement("li");
    const milkRecordLink = document.createElement("a");
    milkRecordLink.className = "dropdown-item";
    milkRecordLink.href = `index.html?v=${Math.random()}`;
    milkRecordLink.innerHTML = '<i class="bi bi-cup-hot me-2"></i> 奶量记录';
    milkRecordItem.appendChild(milkRecordLink);

// 购买记录链接
    const carRecordItem = document.createElement("li");
    const carRecordLink = document.createElement("a");
    carRecordLink.className = "dropdown-item";
    carRecordLink.href = `buy.html?v=${Math.random()}`;
    carRecordLink.innerHTML = '<i class="bi bi-car-front me-2"></i> 购买记录';
    carRecordItem.appendChild(carRecordLink);

// 将菜单项添加到下拉菜单
    dropdownMenu.appendChild(milkRecordItem);
    dropdownMenu.appendChild(carRecordItem);

// 将按钮和菜单添加到下拉容器
    dropdown.appendChild(dropdownBtn);
    dropdown.appendChild(dropdownMenu);

// 添加到页面标题
    const h1 = document.querySelector('h1.text-center');
    h1.appendChild(dropdown);

    // 填充保险公司下拉框
    await fetchInsuranceCompanies();

    // 绑定 UI 事件
    bindUIEvents();

    setTimeout(() => {
        const trendChart = document.getElementById('trendChart');
        if (trendChart) {
            // 触发一次resize确保图表正确显示
            setTimeout(() => {
                const chart = echarts.getInstanceByDom(trendChart);
                if (chart) {
                    chart.resize();
                }
            }, 100);
        }
    }, 500);

    // 渲染记录
    await render();
});

// =======================
// 数据操作函数
// =======================
async function fetchRecords() {
    const payload = {action: 'list_records'};
    const res = await fetchDataFromAPI(API_BASE, payload);
    return res.data.status === 0 ? res.data.data : [];
}

async function addRecord(record) {
    const payload = {action: 'add_record', ...record};
    const res = await fetchDataFromAPI(API_BASE, payload);
    return res.data;
}

async function editRecord(record) {
    const payload = {action: 'edit_record', ...record};
    const res = await fetchDataFromAPI(API_BASE, payload);
    return res.data;
}

async function deleteRecord(id) {
    const payload = {action: 'delete_record', id};
    const res = await fetchDataFromAPI(API_BASE, payload);
    return res.data;
}

async function clearRecords() {
    const payload = {action: 'clear_records'};
    const res = await fetchDataFromAPI(API_BASE, payload);
    return res.data;
}

async function fetchInsuranceCompanies() {
    const insuranceCompanies = [
        '太平洋保险',
    ];

    const colors = [
        '#8a79f2', '#9ade7b', '#ffb6c1',
        '#9dd6ff', '#ffd89c', '#d9de3c', '#ff6b6b'
    ];

    const editSelect = document.getElementById('editInsuranceCompany');
    const addSelect = document.getElementById('insuranceCompany');

    editSelect.innerHTML = '';
    addSelect.innerHTML = '';

    insuranceCompanies.forEach((company, index) => {
        const color = colors[index % colors.length];
        insuranceColors[company] = color;

        [editSelect, addSelect].forEach(select => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            option.style.backgroundColor = color;
            select.appendChild(option);
        });
    });
}

// =======================
// 渲染函数
// =======================
async function render(inputRecords = null) {
    currentRecords = inputRecords || await fetchRecords();
    console.log('当前记录:', currentRecords); // 调试用

    let records = currentRecords.map(r => ({
        ...r,
        insuranceCompany: r.insuranceCompany || '太平洋保险', // 设置默认保险公司
        color: insuranceColors[r.insuranceCompany] || '#20c997',
        note: r.note || ''
    }));

    // 搜索和过滤逻辑保持不变
    const searchTerm = (document.getElementById('search')?.value || '').toLowerCase();
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    if (searchTerm) {
        records = records.filter(r =>
            (r.insuranceCompany || '').toLowerCase().includes(searchTerm) ||
            (r.note || '').toLowerCase().includes(searchTerm)
        );
    }

    if (startDate) records = records.filter(r => r.date >= startDate);
    if (endDate) records = records.filter(r => r.date <= endDate);

    // 排序逻辑保持不变
    const sortBy = document.getElementById('sortBy')?.value;
    records.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc': return new Date(b.date) - new Date(a.date);
            case 'date-asc': return new Date(a.date) - new Date(b.date);
            case 'amount-desc': return b.amount - a.amount;
            case 'amount-asc': return a.amount - b.amount;
            default: return new Date(b.date) - new Date(a.date);
        }
    });

    // 渲染列表
    const listEl = document.getElementById('list');
    if (!records.length) {
        listEl.innerHTML = `<div class="empty text-center py-4"><i class="bi bi-inbox" style="font-size:3rem"></i><p>暂无记录</p></div>`;
    } else {
        listEl.innerHTML = records.map(r => `
<div class="record d-flex justify-content-between align-items-center">
    <div class="flex-grow-1">
        <div class="d-flex align-items-center mb-1">
            <span class="badge me-2" style="background-color:${r.color}">${r.insuranceCompany}</span>
            <strong>${r.date}</strong>
        </div>
        <div class="d-flex justify-content-between">
            <em>备注：${r.note}</em>
            <strong class="text-nowrap ms-2">¥${r.amount.toFixed(2)}</strong>
        </div>
        <div class="record-actions ms-2 d-flex gap-1">
            <button class="btn btn-sm btn-outline-primary edit" data-id="${r.id}" title="编辑">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger del" data-id="${r.id}" title="删除">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    </div>
</div>`).join('');
    }

    updateSummary(records);
    updateChartsByRecords(records);
    showToast('数据加载完成!');
}

// 提示函数
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-50 start-50 translate-middle p-2';
    toast.style.zIndex = '1100';
    toast.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show w-auto" role="alert" style="min-width: 200px;">
            <strong>${msg}</strong> 
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1000);
}

// =======================
// 汇总 & 图表
// =======================
function updateSummary(records) {
    const summaryEl = document.getElementById('summary');
    const totalAmount = records.reduce((s, r) => s + r.amount, 0);
    const totalRecords = records.length;

    // 按年份和保险公司分组统计
    const byYear = {};
    records.forEach(r => {
        const year = r.date.split('-')[0];
        if (!byYear[year]) byYear[year] = {amount: 0, count: 0, companies: {}};

        byYear[year].amount += r.amount;
        byYear[year].count += 1;

        if (!byYear[year].companies[r.insuranceCompany]) {
            byYear[year].companies[r.insuranceCompany] = {amount: 0, count: 0};
        }
        byYear[year].companies[r.insuranceCompany].amount += r.amount;
        byYear[year].companies[r.insuranceCompany].count += 1;
    });

    let html = '';

    // 按年份降序排列
    const years = Object.keys(byYear).sort((a, b) => b - a);

    years.forEach(year => {
        html += `<div class="summary-year mb-3">`;

        const companies = Object.keys(byYear[year].companies);

        companies.forEach(company => {
            const val = byYear[year].companies[company];
            html += `
            <div class="summary-item">
                <span>${company}</span>
                <span>${year}年：¥${val.amount.toFixed(2)}</span>
            </div>`;
        });

    });

    // 添加总计
    html += `
        <div class="summary-item mt-3">
            <span>总计</span>
            <span>¥${totalAmount.toFixed(2)} (${totalRecords}次)</span>
        </div>`;

    summaryEl.innerHTML = html;
}

function updateChartsByRecords(records) {
    const companyData = {};
    const yearData = {};

    records.forEach(r => {
        const year = r.date.split('-')[0];

        // 按保险公司统计
        companyData[r.insuranceCompany] = (companyData[r.insuranceCompany] || 0) + r.amount;

        // 按年份统计
        yearData[year] = yearData[year] || {};
        yearData[year][r.insuranceCompany] = (yearData[year][r.insuranceCompany] || 0) + r.amount;
    });

    // 渲染保费趋势图
    renderPremiumTrendChart('trendChart', records, '保费趋势');
}

function resizeCharts() {
    ['trendChart'].forEach(id => {
        const chart = echarts.getInstanceByDom(document.getElementById(id));
        if (chart) chart.resize();
    });
}

/**
 * 渲染保费趋势图（折线图版本）
 */
function renderPremiumTrendChart(containerId, records, title) {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return null;

    const chart = echarts.init(chartElement);

    // 按年份和保险公司分组
    const yearData = {};
    records.forEach(r => {
        const year = r.date.split('-')[0];
        if (!yearData[year]) yearData[year] = {};
        if (!yearData[year][r.insuranceCompany]) {
            yearData[year][r.insuranceCompany] = 0;
        }
        yearData[year][r.insuranceCompany] += r.amount;
    });

    const years = Object.keys(yearData).sort();
    const companies = [...new Set(records.map(r => r.insuranceCompany))];

    // 改为折线图配置
    const seriesData = companies.map(company => ({
        name: company,
        type: 'line', // 改为折线图
        data: years.map(year => yearData[year][company] || 0),
        smooth: true, // 平滑曲线
        symbol: 'circle', // 数据点显示为圆点
        symbolSize: 8,
        lineStyle: {
            width: 3,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 5,
            shadowOffsetY: 3
        },
        itemStyle: {
            color: getColorForInsuranceCompany(company),
            borderWidth: 2,
            borderColor: '#fff',
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
        },
        emphasis: {
            focus: 'series', // 高亮时聚焦整个系列
            itemStyle: {
                borderWidth: 3,
                shadowBlur: 15
            }
        },
        areaStyle: { // 可选：添加面积图效果
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: getColorForInsuranceCompany(company) + '80' },
                { offset: 1, color: getColorForInsuranceCompany(company) + '10' }
            ])
        }
    }));

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: {
                color: '#4a4a6a',
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'line' // 改为线条指示器
            },
            formatter: function(params) {
                let result = `${params[0].axisValue.replace('年', '')}年<br>`;
                let total = 0;

                params.forEach(param => {
                    if (param.value > 0) {
                        const colorCircle = `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${param.color}"></span>`;
                        result += `${colorCircle}${param.seriesName}: ¥${param.value.toFixed(2)}<br>`;
                        total += param.value;
                    }
                });

                result += `<hr style="margin:5px 0;border-color:rgba(138,121,242,0.3)"><strong>总计: ¥${total.toFixed(2)}</strong>`;
                return result;
            },
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: 'var(--primary-color)',
            textStyle: {
                color: '#4a4a6a'
            }
        },
        legend: {
            data: companies,
            top: 30,
            textStyle: { color: '#4a4a6a' },
            itemWidth: 14,
            itemHeight: 14,
            itemGap: 20
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '80px',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: years.map(y => `${y}年`),
            axisLabel: {
                color: '#4a4a6a',
                fontSize: 12
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(138,121,242,0.3)'
                }
            },
            axisTick: {
                alignWithLabel: true
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: value => '¥' + value.toFixed(0),
                color: '#4a4a6a',
                fontSize: 12
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(138,121,242,0.3)'
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(138,121,242,0.1)',
                    type: 'dashed'
                }
            }
        },
        series: seriesData,
        // 添加动画效果
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
    };

    // 如果没有数据，显示空状态
    if (records.length === 0) {
        option.graphic = {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
                text: '暂无数据',
                fontSize: 16,
                fill: '#999'
            }
        };
    }

    chart.setOption(option);

    // 添加响应式处理
    window.addEventListener('resize', function() {
        chart.resize();
    });

    return chart;
}
// =======================
// UI 事件绑定
// =======================
function bindUIEvents() {
    const addBtn = document.getElementById('add');
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sortBy');
    const listEl = document.getElementById('list');

    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    startDate?.addEventListener('change', () => render());
    endDate?.addEventListener('change', () => render());

    // 添加记录
    addBtn?.addEventListener('click', async () => {
        const record = {
            date: document.getElementById('date').value,
            insuranceCompany: document.getElementById('insuranceCompany').value,
            amount: parseFloat(document.getElementById('amount').value) || 0,
            note: document.getElementById('note').value.trim()
        };

        if (!record.date || !record.insuranceCompany) return alert('请填写日期和保险公司');

        const res = await addRecord(record);
        if (res.status === 0) {
            // 完全重置表单
            document.getElementById('addForm').reset();

            // 重新设置今天日期
            const dateInput = document.getElementById('date');
            if (dateInput) {
                dateInput.value = new Date().toISOString().substr(0, 10);
            }

            await render();
            showToast('记录添加成功!');
        } else {
            alert('添加失败:' + res.msg);
        }
    });

    // 搜索 + 排序
    searchInput?.addEventListener('input', () => render());
    sortSelect?.addEventListener('change', () => render());

    // 查询区间
    document.getElementById('filterRange')?.addEventListener('click', async () => {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        if (!start || !end) return alert('请选择开始和结束日期');

        const payload = {action: 'list_records_range', start_date: start, end_date: end};
        const res = await fetchDataFromAPI(API_BASE, payload);
        const records = res.data.status === 0 ? res.data.data : [];
        await render(records);
    });

    // 全部显示
    document.getElementById('showAll')?.addEventListener('click', async () => {
        const searchInput = document.getElementById('search');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        if (searchInput) searchInput.value = '';
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';

        await render(); // 刷新列表 + 汇总 + 图表
    });

    // 添加输入验证
    document.getElementById('amount')?.addEventListener('input', function (e) {
        this.value = this.value.replace(/[^0-9.]/g, '');
    });

    // 回车键提交
    document.getElementById('addForm')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('add').click();
        }
    });

    // 清除搜索按钮
    const searchClearBtn = document.getElementById('searchClear');
    searchClearBtn?.addEventListener('click', () => {
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.value = '';
            render(); // 刷新列表
        }
    });

    // 编辑/删除事件代理
    listEl?.addEventListener('click', async e => {
        const editBtn = e.target.closest('.edit');
        const delBtn = e.target.closest('.del');
        if (delBtn) {
            if (confirm('确认删除？')) {
                await deleteRecord(delBtn.dataset.id);
                await render();
            }
        }
        if (editBtn) {
            const r = currentRecords.find(r => r.id == editBtn.dataset.id);
            if (!r) return alert('记录不存在');
            document.getElementById('editDate').value = r.date;
            document.getElementById('editIndex').value = r.id;
            document.getElementById('editInsuranceCompany').value = r.insuranceCompany;
            document.getElementById('editAmount').value = r.amount;
            document.getElementById('editNote').value = r.note || '';
            new bootstrap.Modal(document.getElementById('editModal')).show();
        }
    });

    document.getElementById('saveEdit')?.addEventListener('click', async () => {
        const record = {
            id: document.getElementById('editIndex').value,
            date: document.getElementById('editDate').value,
            insuranceCompany: document.getElementById('editInsuranceCompany').value,
            amount: parseFloat(document.getElementById('editAmount').value) || 0,
            note: document.getElementById('editNote').value.trim()
        };
        if (!record.insuranceCompany) return alert('保险公司不能为空');
        await editRecord(record);
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        await render();
    });

    // 折叠按钮
    const toggleBtn = document.getElementById('toggleRecords');
    const listContainer = document.getElementById('list');
    const toggleSummaryBtn = document.getElementById('toggleSummary');
    const summaryContainer = document.getElementById('summary');

    const toggleWithAnimation = (container, icon) => {
        container.classList.toggle('d-none');
        icon?.classList.toggle('bi-chevron-down');
        icon?.classList.toggle('bi-chevron-up');
    }

    toggleBtn?.addEventListener('click', () => toggleWithAnimation(listContainer, toggleBtn.querySelector('i')));
    toggleSummaryBtn?.addEventListener('click', () => toggleWithAnimation(summaryContainer, toggleSummaryBtn.querySelector('i')));

}

// =======================
// 工具函数
// =======================
function getColorForInsuranceCompany(companyName) {
    // 为保险公司分配固定颜色
    const companyColorMap = {
        '平安保险': '#8a79f2',    // 紫色
        '中国人保': '#ffb6c1',    // 绿色
        '太平洋保险': '#9ade7b',  // 粉红
        '中国太平': '#9dd6ff',    // 蓝色
        '阳光保险': '#ffd89c',    // 橙色
        '大地保险': '#d9de3c',    // 黄绿色
        '其他': '#ff6b6b'        // 红色
    };

    // 如果保险公司在映射表中，返回对应颜色
    if (companyColorMap[companyName]) {
        return companyColorMap[companyName];
    }

    // 备用颜色数组
    const backupColors = [
        '#8a79f2', '#9ade7b', '#ffb6c1', '#9dd6ff',
        '#ffd89c', '#d9de3c', '#ff6b6b', '#20b2aa',
        '#32cd32', '#ff7f50', '#da70d6', '#9370db'
    ];

    // 基于公司名称的哈希值选择备用颜色
    let hash = 0;
    for (let i = 0; i < companyName.length; i++) {
        hash = (hash << 5) - hash + companyName.charCodeAt(i);
        hash |= 0;
    }
    hash = Math.abs(hash);

    return backupColors[hash % backupColors.length];
}