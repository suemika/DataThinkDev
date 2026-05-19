const API_BASE = '768';
const categoryColors = {}; // 分类颜色
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

// 车险记录链接
const carRecordItem = document.createElement("li");
const carRecordLink = document.createElement("a");
carRecordLink.className = "dropdown-item";
carRecordLink.href = `car.html?v=${Math.random()}`;
carRecordLink.innerHTML = '<i class="bi bi-car-front me-2"></i> 车险记录';
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
    // 填充分类下拉框
    await fetchCategories();

    // 绑定 UI 事件
    bindUIEvents();
    setTimeout(() => {
        const priceTrendTab = document.getElementById('price-trend-tab');
        if (priceTrendTab && priceTrendTab.classList.contains('active')) {
            // 触发一次resize确保图表正确显示
            setTimeout(() => {
                const chart = echarts.getInstanceByDom(document.getElementById('priceTrendChart'));
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

async function fetchCategories() {
    const payload = {action: 'list_categories'};
    try {
        const res = await fetchDataFromAPI(API_BASE, payload);
        if (res.data.status === 0 && res.data.data) {
            const editSelect = document.getElementById('editGroup');
            const addSelect = document.getElementById('group');
            editSelect.innerHTML = '';
            addSelect.innerHTML = '';

            res.data.data.forEach(cat => {
                const color = cat.color || getColorForType(Math.floor(Math.random() * 20));
                categoryColors[cat.name] = color;

                [editSelect, addSelect].forEach(select => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    option.textContent = cat.name;
                    option.style.backgroundColor = color;
                    select.appendChild(option);
                });
            });
        }
    } catch (err) {
        console.error('获取分类失败', err);
    }
}

// =======================
// 渲染函数
// =======================
async function render(inputRecords = null) {
    currentRecords = inputRecords || await fetchRecords(); // 缓存到全局
    let records = currentRecords;

    const searchTerm = (document.getElementById('search')?.value || '').toLowerCase();
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    // 绑定颜色和默认值
    records.forEach(r => {
        r.color = categoryColors[r.group] || '#ccc';
        r.name = r.name || '';
        r.note = r.note || '';
        r.group = r.group || '';
    });

    // 搜索过滤
    if (searchTerm) {
        records = records.filter(r =>
            r.name.toLowerCase().includes(searchTerm) ||
            r.note.toLowerCase().includes(searchTerm) ||
            r.group.toLowerCase().includes(searchTerm)
        );
    }

    // 日期范围过滤
    if (startDate) records = records.filter(r => r.date >= startDate);
    if (endDate) records = records.filter(r => r.date <= endDate);

    // 排序逻辑
    const sortBy = document.getElementById('sortBy')?.value;
    records.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'amount-desc':
                return b.amount - a.amount;
            case 'amount-asc':
                return a.amount - b.amount;
            default:
                return new Date(b.date) - new Date(a.date);
        }
    });

    // 渲染列表
    const listEl = document.getElementById('list');
    if (!records.length) {
        listEl.innerHTML = `<div class="empty text-center py-4"><i class="bi bi-inbox" style="font-size:3rem"></i><p>暂无记录</p></div>`;
        document.getElementById('summary').innerHTML = '';
        updateChartsByRecords([], [], []);
    } else {
        listEl.innerHTML = records.map(r => `
<div class="record d-flex justify-content-between align-items-center">
    <div class="flex-grow-1">
        <div class="d-flex align-items-center mb-1">
            <span class="badge me-2" style="background-color:${r.color}">${r.group}</span>
            <strong>${r.name}</strong>
            <span class="text-nowrap ms-2">×${r.qty}</span>
        </div>
        <div class="d-flex justify-content-between">
            <em>${r.date} ${r.note}</em>
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

        updateSummary(records);
        updateChartsByRecords(records);
    }

    // ✅ 数据加载完成提示
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
    const totalItems = records.reduce((s, r) => s + parseInt(r.qty), 0);

    const byCategory = {};
    records.forEach(r => {
        if (!byCategory[r.group]) byCategory[r.group] = {amount: 0, count: 0};
        byCategory[r.group].amount += r.amount;
        byCategory[r.group].count += parseInt(r.qty);
    });

    let html = Object.entries(byCategory).map(([cat, val]) => `
        <div class="summary-item">
            <span>${cat}</span>
            <span>¥${val.amount.toFixed(2)} (${val.count}件)</span>
        </div>`).join('');

    html += `
        <div class="summary-item">
            <span>总计</span>
            <span>¥${totalAmount.toFixed(2)} (${totalItems}件)</span>
        </div>`;

    summaryEl.innerHTML = html;
}

function updateChartsByRecords(records) {
    const monthData = {};
    const yearData = {};
    const categoryData = {};

    records.forEach(r => {
        const [y, m] = r.date.split('-');
        const ym = `${y}-${m}`;
        monthData[ym] = monthData[ym] || {};
        monthData[ym][r.group] = (monthData[ym][r.group] || 0) + r.amount;

        yearData[y] = yearData[y] || {};
        yearData[y][r.group] = (yearData[y][r.group] || 0) + r.amount;

        categoryData[r.group] = (categoryData[r.group] || 0) + r.amount;
    });

    // 渲染所有图表
    renderPriceTrendChart('priceTrendChart', records, '类别单价趋势'); // 新增

    renderMonthlyTrendChart('monthChart', monthData, '月度消费趋势');
    renderDonutChart('categoryChart', categoryData, '消费分类占比');
    renderTrendChart('yearChart', yearData, '年度消费趋势');

    // 渲染消费日历（使用当前年份）
    const currentYear = new Date().getFullYear();
    renderCalendarHeatmap('calendarChart', records, currentYear.toString());

    // 渲染分类对比雷达图
    renderRadarChart('radarChart', categoryData);

    // 窗口大小变化时重绘
    window.addEventListener('resize', resizeCharts);

    // Tab 切换时重绘
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tabBtn => {
        tabBtn.addEventListener('shown.bs.tab', resizeCharts);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const tabEl = document.querySelector('#chartTab');
    if (tabEl) {
        tabEl.addEventListener('shown.bs.tab', function (event) {
            const targetId = event.target.getAttribute('data-bs-target');
            const chartId = targetId.replace('Tab', '');

            // 如果是单价趋势图，确保它正确渲染
            if (chartId === 'priceTrendChart') {
                setTimeout(() => {
                    const chart = echarts.getInstanceByDom(document.getElementById(chartId));
                    if (chart) {
                        chart.resize();
                    }
                }, 50);
            }
        });
    }
});

function resizeCharts() {
    ['monthChart', 'categoryChart', 'yearChart', 'calendarChart', 'radarChart', 'priceTrendChart']
        .forEach(id => echarts.getInstanceByDom(document.getElementById(id))?.resize());
}


function renderMonthlyTrendChart(containerId, data, title) {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return null;

    const chart = echarts.init(chartElement);

    const xAxisData = Object.keys(data).sort();
    const seriesNames = [...new Set(xAxisData.flatMap(date => Object.keys(data[date])))];

    // 过滤掉没有数据的分类
    const validSeriesNames = seriesNames.filter(name =>
        xAxisData.some(date => (data[date][name] || 0) > 0)
    );

    // 计算每月总消费
    const monthlyTotals = {};
    xAxisData.forEach(date => {
        monthlyTotals[date] = Object.values(data[date]).reduce((sum, val) => sum + val, 0);
    });

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: {color: '#4a4a6a', fontSize: 16}
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {type: 'line'},
            formatter: params => {
                let result = `${params[0].axisValue}<br>`;

                // 添加分类数据
                params.filter(p => p.seriesName !== '月度合计').forEach(p => {
                    result += `${p.seriesName}: ¥${(p.data || 0).toFixed(2)}<br>`;
                });

                // 添加合计数据
                const totalParam = params.find(p => p.seriesName === '月度合计');
                if (totalParam) {
                    result += `<hr style="margin:5px 0"><strong>${totalParam.seriesName}: ¥${(totalParam.data || 0).toFixed(2)}</strong>`;
                }

                return result;
            }
        },
        legend: {
            data: [...validSeriesNames, '月度合计'],
            top: 30,
            textStyle: {color: '#4a4a6a'}
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
            boundaryGap: false,
            data: xAxisData,
            axisLabel: {rotate: 45, color: '#4a4a6a'}
        },
        yAxis: {
            type: 'value',
            axisLabel: {formatter: value => '¥' + value.toFixed(2), color: '#4a4a6a'}
        },
        series: [
            // 分类折线
            ...validSeriesNames.map(name => ({
                name,
                type: 'line',
                smooth: true,
                lineStyle: {width: 3},
                symbol: 'circle',
                symbolSize: 8,
                data: xAxisData.map(date => parseFloat((data[date][name] || 0).toFixed(2))),
                itemStyle: {color: getColorForCategory(name)},
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {offset: 0, color: getColorForCategory(name) + '20'},
                        {offset: 1, color: getColorForCategory(name) + '05'}
                    ])
                }
            })),
            // 合计趋势线
            {
                name: '月度合计',
                type: 'line',
                smooth: true,
                lineStyle: {
                    width: 2,
                    type: 'dashed',
                    color: '#ff6b6b'
                },
                symbol: 'diamond',
                symbolSize: 10,
                data: xAxisData.map(date => parseFloat((monthlyTotals[date] || 0).toFixed(2))),
                itemStyle: {
                    color: '#ff6b6b'
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}',
                    color: '#ff6b6b',
                },
                zlevel: 10 // 确保合计线显示在最上层
            }
        ]
    };

    chart.setOption(option);
    return chart;
}

function renderDonutChart(containerId, categoryData, title) {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return null;

    const chart = echarts.init(chartElement);

    const data = Object.entries(categoryData)
        .map(([name, value]) => {
            const val = parseFloat(value) || 0;
            return {
                name,
                value: parseFloat(val.toFixed(2))  // 保证是数值且两位小数
            };
        })
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

    if (data.length === 0) {
        chartElement.innerHTML = '<div class="text-center p-4 text-muted">暂无数据</div>';
        return null;
    }

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: {color: '#4a4a6a', fontSize: 16}
        },
        tooltip: {
            trigger: 'item',
            formatter: params => {
                return `${params.seriesName}<br/>${params.name}: ¥${parseFloat(params.value).toFixed(2)} (${params.percent.toFixed(2)}%)`;
            }
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            top: 'middle',
            textStyle: {color: '#4a4a6a'}
        },
        series: [{
            name: '消费占比',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: {
                show: false,
                position: 'center'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: '14',
                    fontWeight: 'bold',
                    formatter: params => {
                        return `${params.seriesName}\n${params.name}\n¥${parseFloat(params.value).toFixed(2)} (${params.percent.toFixed(2)}%)`;
                    }
                }
            },
            labelLine: {show: false},
            data: data.map(item => ({
                ...item,
                itemStyle: {color: getColorForCategory(item.name)}
            }))
        }]
    };

    chart.setOption(option);
    return chart;
}

function renderTrendChart(containerId, data, title) {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return null;

    const chart = echarts.init(chartElement);
    const xAxisData = Object.keys(data).sort();
    const seriesNames = [...new Set(xAxisData.flatMap(date => Object.keys(data[date])))];


    // 过滤掉没有数据的分类
    const validSeriesNames = seriesNames.filter(name =>
        xAxisData.some(date => (parseFloat(data[date][name]) || 0) > 0)
    );

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: {color: '#4a4a6a', fontSize: 16}
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {type: 'line'},
            formatter: params => {
                return params.map(p =>
                    `${p.seriesName}: ¥${parseFloat(p.value).toFixed(2)}`
                ).join('<br/>');
            }
        },
        legend: {
            data: validSeriesNames,
            top: 30,
            textStyle: {color: '#4a4a6a'}
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
            boundaryGap: false,
            data: xAxisData,
            axisLabel: {rotate: 45, color: '#4a4a6a'}
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: value => '¥' + parseFloat(value).toFixed(2),
                color: '#4a4a6a'
            }
        },
        series: validSeriesNames.map(name => ({
            name: name,
            type: 'line',
            stack: 'Total',
            smooth: true,
            lineStyle: {width: 3},
            symbol: 'circle',
            symbolSize: 8,
            data: xAxisData.map(date => {
                const val = parseFloat(data[date][name]) || 0;
                return parseFloat(val.toFixed(2));
            }),
            itemStyle: {color: getColorForCategory(name)},
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    {offset: 0, color: getColorForCategory(name) + '80'},
                    {offset: 1, color: getColorForCategory(name) + '20'}
                ])
            }
        }))
    };

    chart.setOption(option);
    return chart;
}


function renderCalendarHeatmap(containerId, records, year) {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return null;

    const chart = echarts.init(chartElement);

    // 处理数据为热力图格式
    const dailyData = {};
    records.forEach(record => {
        const date = record.date;
        if (date.startsWith(year)) {
            dailyData[date] = (dailyData[date] || 0) + record.amount;
        }
    });

    const data = Object.entries(dailyData).map(([date, value]) => ({
        value: [date, value],
        amount: value
    }));

    if (data.length === 0) {
        chartElement.innerHTML = `<div class="text-center p-4 text-muted">${year}年暂无数据</div>`;
        return null;
    }

    const maxAmount = Math.max(...data.map(item => item.amount));

    const option = {
        title: {
            text: `${year}年消费日历`,
            left: 'center',
            textStyle: {color: '#4a4a6a', fontSize: 16}
        },
        tooltip: {
            position: 'top',
            formatter: function (params) {
                return `日期: ${params.value[0]}<br>消费: ¥${params.data.amount.toFixed(2)}`;
            }
        },
        visualMap: {
            min: 0,
            max: maxAmount,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            inRange: {
                color: ['#f0e6ff', '#d9c3f0', '#b2a4ff', '#8a79f2', '#6a59d2']
            }
        },
        calendar: {
            top: 60,
            left: 30,
            right: 30,
            cellSize: ['auto', 20],
            range: year,
            itemStyle: {
                borderWidth: 0.5,
                borderColor: '#f0f0f0'
            },
            yearLabel: {show: false},
            dayLabel: {
                firstDay: 1,
                nameMap: 'cn'
            },
            monthLabel: {
                nameMap: 'cn'
            }
        },
        series: {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: data
        }
    };

    chart.setOption(option);
    return chart;
}

function renderRadarChart(containerId, categoryData) {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return null;

    const chart = echarts.init(chartElement);

    // 过滤掉值为0的分类并按金额排序
    const filteredData = Object.entries(categoryData)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1]);

    if (filteredData.length === 0) {
        chartElement.innerHTML = '<div class="text-center p-4 text-muted">暂无数据</div>';
        return null;
    }

    const categories = filteredData.map(([name]) => name);
    const values = filteredData.map(([_, value]) => parseFloat(value.toFixed(2)));
    const maxValue = Math.max(...values) * 1.2;

    const option = {
        title: {
            text: '消费分类对比',
            left: 'center',
            textStyle: {color: '#4a4a6a', fontSize: 16}
        },
        tooltip: {
            formatter: function (params) {
                return `${params.name}: ¥${params.value}`;
            }
        },
        radar: {
            indicator: categories.map(name => ({
                name: name.length > 4 ? name.substring(0, 4) + '...' : name,
                max: maxValue
            })),
            radius: 65,
            splitNumber: 4,
            axisName: {
                color: '#4a4a6a',
                fontSize: 10
            }
        },
        series: [{
            type: 'radar',
            data: [{
                value: values,
                name: '消费金额',
                areaStyle: {
                    color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [{
                        offset: 0,
                        color: 'rgba(138, 121, 242, 0.3)'
                    }, {
                        offset: 1,
                        color: 'rgba(138, 121, 242, 0.1)'
                    }])
                },
                lineStyle: {
                    color: '#8a79f2',
                    width: 2
                },
                itemStyle: {
                    color: '#8a79f2'
                }
            }]
        }]
    };

    chart.setOption(option);
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
            name: document.getElementById('name').value.trim(),
            qty: parseInt(document.getElementById('qty').value) || 1,
            group: document.getElementById('group').value,
            amount: parseFloat(document.getElementById('amount').value) || 0,
            note: document.getElementById('note').value.trim()
        };

        if (!record.date || !record.name) return alert('请填写日期和物品名称');

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

    document.getElementById('qty')?.addEventListener('input', function (e) {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value === '0') this.value = '1';
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
            document.getElementById('editName').value = r.name;
            document.getElementById('editQty').value = r.qty;
            document.getElementById('editGroup').value = r.group;
            document.getElementById('editAmount').value = r.amount;
            document.getElementById('editNote').value = r.note || '';
            new bootstrap.Modal(document.getElementById('editModal')).show();
        }
    });

    document.getElementById('saveEdit')?.addEventListener('click', async () => {
        const record = {
            id: document.getElementById('editIndex').value,
            date: document.getElementById('editDate').value,
            name: document.getElementById('editName').value.trim(),
            qty: parseInt(document.getElementById('editQty').value),
            group: document.getElementById('editGroup').value,
            amount: parseFloat(document.getElementById('editAmount').value) || 0,
            note: document.getElementById('editNote').value.trim()
        };
        if (!record.name) return alert('物品名称不能为空');
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

/**
 * 渲染类别单价趋势图
 */
function renderPriceTrendChart(containerId, records, title) {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return null;

    const chart = echarts.init(chartElement);

    // 计算单价
    const recordsWithPrice = records.map(r => ({
        ...r,
        unitPrice: parseFloat((r.amount / r.qty).toFixed(2))
    }));

    // 按类别分组并按日期排序
    const categories = [...new Set(recordsWithPrice.map(r => r.group))];

    // 获取所有日期并排序
    const allDates = [...new Set(recordsWithPrice.map(r => r.date))].sort();

    const seriesData = [];

    categories.forEach(category => {
        const categoryRecords = recordsWithPrice
            .filter(r => r.group === category)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (categoryRecords.length > 0) {
            // 为每个类别创建连续的数据点
            const categoryDates = [...new Set(categoryRecords.map(r => r.date))].sort();
            const priceData = categoryDates.map(date => {
                const record = categoryRecords.find(r => r.date === date);
                return [date, record.unitPrice];
            });

            seriesData.push({
                name: category,
                type: 'line',
                data: priceData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: {
                    width: 3
                },
                itemStyle: {
                    color: getColorForCategory(category)
                },
                emphasis: {
                    focus: 'series'
                },
                // 确保每个类别的线是独立的
                connectNulls: false
            });
        }
    });

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: {color: '#4a4a6a', fontSize: 16}
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            formatter: function (params) {
                let result = ``;
                params.forEach(param => {
                    if (param.value && param.value[1] !== undefined) {
                        result += `${param.seriesName}: ¥${param.value[1].toFixed(2)}<br>`;
                    }
                });
                return result;
            }
        },
        legend: {
            data: categories,
            top: 30,
            textStyle: {color: '#4a4a6a'}
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '80px',
            containLabel: true
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLabel: {
                formatter: function (value) {
                    return echarts.time.format(value, '{yyyy}-{MM}-{dd}', false);
                },
                rotate: 45,
                color: '#4a4a6a'
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: value => '¥' + value.toFixed(2),
                color: '#4a4a6a'
            }
        },
        series: seriesData
    };

    chart.setOption(option);
    return chart;
}

// =======================
// 工具函数
// =======================
function getColorForType(typeID) {
    const colors = [
        '#8a79f2', '#b2a4ff', '#c1b5ff', '#a396f5', // 紫色系
        '#ffb6c1', '#ffc8d3', '#ff9ebb', '#fdabaf', // 粉色系
        '#9ade7b', '#b4e89c', '#85c97b', '#c5efac', // 柔和绿色系
        '#9dd6ff', '#b8e3ff', '#7bc8f6', '#d0eeff', // 蓝色系
        '#ffd89c', '#ffe4b8', '#fac87c', '#ffefcf', // 柔和黄色系
        '#d9c3f0', '#e5d5fa', '#c5a8e8', '#f0e6ff'  // 淡紫色系
    ];
    return colors[typeID % colors.length];
}

// =======================
// 工具函数
// =======================
function getColorForCategory(categoryName) {
    // 为所有分类分配固定颜色
    const categoryColorMap = {
        '辅食': '#8a79f2',    // 紫色 - 主食类
        '用品': '#9ade7b',    // 绿色 - 日常用品
        '洗护': '#ffb6c1',    // 粉红 - 洗护用品
        '床品': '#9dd6ff',    // 蓝色 - 床上用品
        '穿戴': '#ffd89c',    // 橙色 - 服装类
        '纸尿裤': '#d9de3c',    // 黄绿色 - 纸尿裤
        '奶粉': '#ff42d2',    // 玫红色 - 奶粉
        '铁': '#ff6b6b',      // 红色 - 补铁剂
        '钙锌': '#20b2aa',    // 青绿色 - 钙锌补充
        '钙': '#32cd32',      // 酸橙绿 - 钙补充
        'AD': '#ff7f50',     // 珊瑚橙 - 维生素AD
        'DHA': '#da70d6'      // 兰花紫 - DHA补充
    };

    // 如果分类在映射表中，返回对应颜色
    if (categoryColorMap[categoryName]) {
        return categoryColorMap[categoryName];
    }

    // 备用颜色数组（如果出现未列出的分类）
    const backupColors = [
        '#8a79f2', '#9ade7b', '#ffb6c1', '#9dd6ff',
        '#ffd89c', '#d9de3c', '#ff42d2', '#ff6b6b',
        '#20b2aa', '#32cd32', '#ff7f50', '#da70d6',
        '#9370db', '#ffa500', '#3cb371', '#ff4500'
    ];

    // 基于分类名称的哈希值选择备用颜色
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
        hash = (hash << 5) - hash + categoryName.charCodeAt(i);
        hash |= 0;
    }
    hash = Math.abs(hash);

    return backupColors[hash % backupColors.length];
}