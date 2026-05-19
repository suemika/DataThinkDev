document.addEventListener('DOMContentLoaded', function () {


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
    milkRecordLink.href = `buy.html?v=${Math.random()}`;
    milkRecordLink.innerHTML = '<i class="bi bi-cup-hot me-2"></i> 购买记录';
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
    // 常量定义
    const API_ENDPOINTS = {
        ADD_RECORD: '716',
        TODAY_STATS: '713',
        TODAY_TYPES_STATS: '743',
        RECENT_RECORDS: '714',
        DAILY_STATS: '715',
        RECORD_DEL: '717',
        FEEDING_TYPES: '742',
        TYPE_STATS: '749',
        HEAT_MAP: '758'
    };

    // 配置常量
    const CONFIG = {
        DEFAULT_DAYS_RANGE: 30,
        CHART_HEIGHT: 400,
        MOBILE_CHART_HEIGHT: 300,
    };

    // DOM元素缓存
    const elements = {
        timeInput: document.getElementById('time'),
        amountInput: document.getElementById('amount'),
        notesInput: document.getElementById('notes'),
        recordForm: document.getElementById('recordForm'),
        recentRecordsContainer: document.getElementById('recentRecords'),
        totalAmountDisplay: document.getElementById('totalAmount'),
        feedCountDisplay: document.getElementById('feedCount'),
        milkChart: document.getElementById('milkChart'),
        dayRange: document.getElementById('dayRange'),
        refreshBtn: document.getElementById('refreshRecords'),
        prevDayBtn: document.getElementById('prevDayBtn'),
        todayBtn: document.getElementById('todayBtn'),
        recordsDateDisplay: document.getElementById('recordsDateDisplay'),
        feedingTypeSelect: document.getElementById('feedingType'),
        typeStatsChart: document.getElementById('typeStatsChart'),
        typeStatsDetails: document.getElementById('typeStatsDetails'),
        loadingIndicator: document.createElement('div'),
        typeChart: document.getElementById('typeChart'),
        typeStatsRange: document.getElementById('typeStatsRange'),
        typeStatsListContainer: document.getElementById('typeStatsList')
    };

    // 检查所有必需元素是否存在
    function validateElements() {
        for (const [key, element] of Object.entries(elements)) {
            if (!element && key !== 'loadingIndicator') {
                console.error(`元素 ${key} 未找到`);
                return false;
            }
        }
        return true;
    }

    if (!validateElements()) {
        showAlert('系统初始化失败，请刷新页面重试', 'error');
        return;
    }

    // 初始化加载指示器
    function initLoadingIndicator() {
        elements.loadingIndicator.className = 'loading-indicator';
        elements.loadingIndicator.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
            <span class="loading-text">加载中...</span>
        `;
        document.body.appendChild(elements.loadingIndicator);
    }

    // 全局变量
    let milkChartInstance = null;
    let typeStatsChartInstance = null;
    let currentRecordsDate = new Date();
    let isMobileView = window.innerWidth < 768;
    let typeChart;  // 类型统计图表实例
    let heatmapChart; // 新增的热力图实例
    // 主初始化函数
    async function initialize() {
        initLoadingIndicator();
        initDateTime();
        initCharts();
        initTypeChart();
        heatmapChart = initHeatmap();
        setupEventListeners();
        updateRecordsDateDisplay();

        try {
            await Promise.all([
                loadFeedingTypes(),
                refreshAllData()
            ]);

            // 延迟初始化类型统计图表
            setTimeout(() => {
                if (document.getElementById('type-stats-tab-pane').classList.contains('active')) {
                    typeStatsChartInstance = echarts.init(document.getElementById('typeStatsChart'));
                    loadTodayStats();
                    typeStatsTabInitialized = true;
                }
            }, 500);

        } catch (error) {
            console.error('初始化失败:', error);
            showAlert('初始化数据失败，请刷新重试', 'error');
        } finally {
            hideLoading();
        }
    }

    function calculateFeedingIntervals(records) {
        if (records.length === 0) return null;

        const now = new Date();
        const sortedRecords = [...records].sort((a, b) =>
            new Date(a.time) - new Date(b.time));

        // 1. 处理喂养类（母乳+奶粉）
        const feedingRecords = sortedRecords.filter(record =>
            ['母乳', '奶粉', '瓶喂母乳'].includes(record.typeName));

        let feedingInterval = null;
        if (feedingRecords.length >= 2) {
            const intervals = [];
            for (let i = 1; i < feedingRecords.length; i++) {
                const diff = (new Date(feedingRecords[i].time) -
                    new Date(feedingRecords[i - 1].time)) / (1000 * 60 * 60);
                intervals.push(diff);
            }
            feedingInterval = (intervals.reduce((sum, val) => sum + val, 0) / intervals.length).toFixed(1);
        }

        const lastFeeding = feedingRecords[feedingRecords.length - 1];
        const lastFeedingHours = lastFeeding
            ? ((now - new Date(lastFeeding.time)) / (1000 * 60 * 60)).toFixed(1)
            : null;

        // 2. 处理其他类型（单次记录）
        const otherTypes = {};
        sortedRecords.forEach(record => {
            if (!['母乳', '奶粉', '瓶喂母乳'].includes(record.typeName)) {
                const hoursAgo = ((now - new Date(record.time)) / (1000 * 60 * 60)).toFixed(1);
                otherTypes[record.typeName] = hoursAgo;
            }
        });

        return {
            feeding: {
                interval: feedingInterval,
                lastHours: lastFeedingHours,
                lastType: lastFeeding?.typeName
            },
            others: otherTypes
        };
    }

    function displayFeedingInfo(result) {
        if (!result) return '<div class="no-data" style="font-size:13px;">暂无喂养数据</div>';

        let html = '<div class="feeding-info">';

        // 喂养类信息 - 更紧凑的布局
        html += '<div class="feeding-section">';
        html += '<h4>🍼 喂养记录</h4>';

        if (result.feeding.interval) {
            html += `<p><span>平均间隔</span><span class="highlight">${result.feeding.interval}小时</span></p>`;
        }

        if (result.feeding.lastHours) {
            html += `<p><span>上次${result.feeding.lastType}</span><span class="highlight">${result.feeding.lastHours}小时前</span></p>`;
        }

        html += '</div>';

        // 其他类型信息 - 两列式布局
        if (Object.keys(result.others).length > 0) {
            html += '<div class="other-section">';
            html += '<h4>💊 其他记录</h4>';

            for (const [type, hours] of Object.entries(result.others)) {
                html += `<p><span>${type}</span><span class="highlight">${hours}小时前</span></p>`;
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // 初始化日期时间
    function initDateTime() {
        const now = new Date();
        const timezoneOffset = now.getTimezoneOffset() * 60000;
        const localISOTime = new Date(now - timezoneOffset).toISOString().slice(0, 16);
        elements.timeInput.value = localISOTime;
    }

    // 初始化图表
    function initCharts() {
        if (!elements.milkChart) return;

        // 根据屏幕尺寸调整图表高度
        const chartHeight = isMobileView ? CONFIG.MOBILE_CHART_HEIGHT : CONFIG.CHART_HEIGHT;
        elements.milkChart.style.height = `${chartHeight}px`;

        // 主奶量图表
        milkChartInstance = echarts.init(elements.milkChart);
        milkChartInstance.setOption(getChartOption());

        // 喂养类型图表
        typeStatsChartInstance = echarts.init(elements.typeStatsChart);
    }

    // 获取图表配置
    function getChartOption() {
        return {
            title: {
                subtext: '平均值: -- ml',
                left: 'center',
                textStyle: {
                    color: '#666'
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: formatTooltip,
                backgroundColor: 'rgba(50,50,50,0.9)',
                borderColor: '#333',
                borderWidth: 1,
                textStyle: {
                    color: '#fff'
                },
                axisPointer: {
                    type: 'shadow',
                    shadowStyle: {
                        color: 'rgba(150,150,150,0.2)'
                    }
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: [],
                axisLine: {
                    lineStyle: {
                        color: '#ccc'
                    }
                },
                axisLabel: {
                    color: '#666',
                    rotate: 45,
                    formatter: value => {
                        const parts = value.split('-');
                        return parts.length > 2 ? `${parts[1]}/${parts[2]}` : value;
                    }
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: ['#f0f0f0'],
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '奶量(ml)',
                nameTextStyle: {
                    color: '#666',
                    padding: [0, 0, 0, 40]
                },
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: '#ccc'
                    }
                },
                axisLabel: {
                    color: '#666'
                },
                splitLine: {
                    lineStyle: {
                        color: ['#f0f0f0'],
                        type: 'dashed'
                    }
                }
            },
            series: [{
                name: '每日总奶量',
                type: 'line',
                smooth: true,
                data: [],
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: {
                    color: '#36a3f7',
                    borderColor: '#fff',
                    borderWidth: 2
                },
                lineStyle: {
                    width: 3,
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        {offset: 0, color: '#36a3f7'},
                        {offset: 1, color: '#4fd6d2'}
                    ])
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {offset: 0, color: 'rgba(54, 163, 247, 0.5)'},
                        {offset: 1, color: 'rgba(79, 214, 210, 0.1)'}
                    ])
                },
                markPoint: {
                    symbol: 'pin',
                    symbolSize: isMobileView ? 50 : 60,
                    itemStyle: {
                        color: '#ff4d6a'
                    },
                    label: {
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 'bold'
                    },
                    data: [
                        {type: 'max', name: '最大值', itemStyle: {color: '#ff4d6a'}},
                        {type: 'min', name: '最小值', itemStyle: {color: '#ffb74d'}}
                    ]
                },
                markLine: {
                    silent: true,
                    symbol: ['none', 'none'],
                    lineStyle: {
                        color: '#ff9f43',
                        width: 2,
                        type: 'dashed'
                    },
                    label: {
                        show: !isMobileView,
                        position: 'end',
                        formatter: '平均: {c}ml',
                        color: '#ff9f43',
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        padding: [3, 5],
                        borderRadius: 4
                    },
                    data: [{type: 'average', name: '平均值'}]
                }
            }, {
                name: '7日移动平均',
                type: 'line',
                smooth: true,
                data: [],
                symbol: 'none',
                lineStyle: {
                    width: 3,
                    type: 'dashed',
                    color: '#ff9f43'
                }
            }],
            dataZoom: [{
                type: 'slider',
                show: true,
                xAxisIndex: [0],
                start: 0,
                end: 100,
                backgroundColor: '#f5f5f5',
                borderColor: '#ddd',
                fillerColor: 'rgba(54, 163, 247, 0.2)',
                handleStyle: {
                    color: '#36a3f7'
                },
                textStyle: {
                    color: '#666'
                }
            }],
            backgroundColor: 'transparent'
        };
    }

    function initTypeChart() {
        if (!elements.typeChart) return;

        typeChart = echarts.init(elements.typeChart);

        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c}ml ({d}%)'
            },
            legend: {
                orient: 'horizontal',
                bottom: 0,
                data: []
            },
            series: [
                {
                    name: '喂养类型分布',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b} \n {c}ml'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '18',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: true
                    },
                    data: []

                }
            ]
        };

        typeChart.setOption(option);
    }

    // 新增加载类型统计数据函数
    async function loadTypeStats(days = 7) {
        if (!typeChart) return;

        showChartLoading(typeChart);

        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days + 1);

            const response = await fetchDataFromAPI(API_ENDPOINTS.TYPE_STATS, {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate)
            });

            if (response.data.status === 0) {
                updateTypeChart(response.data.data);
                updateTypeStatsList(response.data.data);
            }
        } catch (error) {
            console.error('加载类型统计数据失败:', error);
            showAlert('加载类型统计数据失败', 'error');
        } finally {
            hideChartLoading(typeChart);
        }
    }

    function updateTypeStatsList(data) {
        if (!data || data.length === 0) {
            elements.typeStatsListContainer.innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }

        const total = data.reduce((sum, item) => sum + item.totalAmount, 0);

        const listHTML = data.map(item => {
            const percent = Math.round((item.totalAmount / total) * 100);
            const color = getColorForType(item.typeID); // 使用统一颜色函数
            return `
            <div class="stat-item">
                <span class="type-badge" style="background-color: ${color}"></span>
                <span class="type-name">${item.typeName}</span>
                <span class="type-amount">${item.totalAmount} ml</span>
                <span class="type-percent">${percent}%</span>
            </div>
        `;
        }).join('');

        elements.typeStatsListContainer.innerHTML = listHTML;
    }

    // 新增更新类型统计图表函数
    function updateTypeChart(typeData) {
        if (!typeChart || !typeData) return;

        typeChart.setOption({
            legend: {
                data: typeData.map(item => item.typeName)
            },
            series: [{
                data: typeData.map(item => ({
                    value: item.totalAmount,
                    name: item.typeName,
                    itemStyle: {
                        color: getColorForType(item.typeID)  // 自定义颜色函数
                    }
                }))
            }]
        });
    }

    // 新增类型颜色映射函数
    function getColorForType(typeID) {
        const colors = [
            '#36b9cc',  // 1. 亮青色
            '#1cc88a',  // 2. 亮绿色
            '#f6c23e',  // 3. 黄色
            '#4e73df',  // 5. 蓝色
            '#a64ac9',  // 6. 紫色
            '#f17a54',  // 7. 橙色
            '#2ecc71',  // 8. 翠绿色
            '#ff6b6b',  // 9. 粉红色
            '#00a8cc',  // 10. 深天蓝（新增）
            '#9966ff',  // 11. 紫罗兰（新增）
            '#ff9f40',  // 12. 橙黄色（新增）
            '#4bc0c0',  // 13. 蓝绿色（新增）
            '#ff6384',  // 14. 玫红色（新增）
            '#36a2eb',  // 15. 天蓝色（新增）
            '#c9cbcf',  // 16. 灰色（新增）
            '#ffcd56',  // 17. 柠檬黄（新增）
            '#65c6bb',  // 18. 薄荷绿（新增）
            '#9b59b6',  // 19. 深紫色（新增）
            '#3498db'   // 20. 亮蓝色（新增）
        ];
        return colors[typeID % colors.length];
    }

    // 格式化工具提示
    function formatTooltip(params) {
        if (!params || params.length === 0) return '';

        let result = `<div style="font-weight:bold;margin-bottom:5px">${params[0].axisValue}</div>`;
        params.forEach(item => {
            result += `
        <div style="display:flex;align-items:center;margin:3px 0">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:5px"></span>
            ${item.seriesName}: <strong style="margin-left:5px;color:${item.color}">${item.value}ml</strong>
        </div>`;
        });

        const seriesData = params[0]?.series?.data || [];
        if (seriesData.length > 0) {
            const avg = seriesData.reduce((sum, val) => sum + (val || 0), 0) / seriesData.length;
            result += `
        <div style="margin-top:5px;padding-top:5px;border-top:1px dashed #555">
            <span style="color:#ff9f43">◆</span> 平均值: <strong style="color:#ff9f43">${avg.toFixed(1)}ml</strong>
        </div>`;
        }

        return result;
    }

    // 设置事件监听
    function setupEventListeners() {
        // 表单提交
        elements.recordForm?.addEventListener('submit', handleFormSubmit);

        // 记录容器事件委托
        elements.recentRecordsContainer?.addEventListener('click', handleRecordContainerClick);

        // 日期范围选择
        elements.dayRange?.addEventListener('change', () => {
            loadDailyData(parseInt(elements.dayRange.value));
        });

        // 刷新按钮
        elements.refreshBtn?.addEventListener('click', handleRefreshClick);

        // 日期导航
        elements.prevDayBtn?.addEventListener('click', goToPreviousDay);
        elements.todayBtn?.addEventListener('click', goToToday);

        // 窗口大小变化
        window.addEventListener('resize', handleWindowResize);

        if (elements.typeStatsRange) {
            elements.typeStatsRange.addEventListener('change', function () {
                loadTypeStats(parseInt(this.value));
            });
        }

        document.getElementById('statsTabs')?.addEventListener('shown.bs.tab', function (event) {
            const activeTab = event.target.getAttribute('data-bs-target');
            if (activeTab === '#type-stats-tab-pane') {
                if (!typeStatsTabInitialized) {
                    // 延迟执行确保DOM完全加载
                    setTimeout(() => {
                        typeStatsChartInstance = echarts.init(document.getElementById('typeStatsChart'));
                        loadTodayStats(); // 重新加载数据
                        typeStatsTabInitialized = true;
                    }, 100);
                } else if (typeStatsChartInstance) {
                    typeStatsChartInstance.resize();
                }
            }
        });

        // 当页签切换时重新渲染图表
        document.getElementById('chartTabs').addEventListener('shown.bs.tab', function (event) {
            const activeTab = event.target.getAttribute('data-bs-target');

            if (activeTab === '#daily-tab-pane') {
                milkChartInstance.resize();
            } else if (activeTab === '#type-tab-pane') {
                typeChart.resize();
            } else if (activeTab === '#heatmap-tab-pane') {
                heatmapChart.resize();
            }
        });

    }

    // 处理表单提交
    async function handleFormSubmit(e) {
        e.preventDefault();

        if (!validateForm()) return;

        const formData = {
            amount: parseInt(elements.amountInput.value),
            time: elements.timeInput.value,
            notes: elements.notesInput.value.trim(),
            typeId: elements.feedingTypeSelect.value
        };

        showLoading('保存中...');

        try {
            const response = await fetchDataFromAPI(API_ENDPOINTS.ADD_RECORD, formData);

            if (response.data.status === 0) {
                showAlert('记录保存成功!', 'success');
                resetForm();
                await refreshAllData();
            } else {
                throw new Error(response.data.message || '保存失败');
            }
        } catch (error) {
            console.error("保存记录错误: ", error);
            showAlert(error.message || '保存失败，请重试', 'error');
        } finally {
            hideLoading();
        }
    }

    // 表单验证
    function validateForm() {
        if (!elements.feedingTypeSelect.value) {
            showAlert('请选择喂养类型', 'warning');
            elements.feedingTypeSelect.focus();
            return false;
        }

        if (!elements.timeInput.value) {
            showAlert('请选择时间', 'warning');
            elements.timeInput.focus();
            return false;
        }

        return true;
    }

    // 重置表单
    function resetForm() {
        elements.amountInput.value = '';
        elements.notesInput.value = '';
        initDateTime();
    }

    // 处理记录容器点击
    function handleRecordContainerClick(e) {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            e.preventDefault();
            deleteRecord(deleteBtn.dataset.id);
        }
    }

    // 删除记录
    async function deleteRecord(recordId) {
        if (!confirm('确定要删除这条记录吗？')) return;

        showLoading('删除中...');

        try {
            const response = await fetchDataFromAPI(API_ENDPOINTS.RECORD_DEL, recordId);

            if (response.data.status === 0) {
                showAlert('记录已删除', 'success');
                await refreshAllData();
            } else {
                throw new Error(response.data.message || '删除失败');
            }
        } catch (error) {
            console.error('删除记录错误:', error);
            showAlert(error.message || '删除失败，请稍后再试', 'error');
        } finally {
            hideLoading();
        }
    }

    // 处理刷新点击
    async function handleRefreshClick() {
        showLoading('刷新中...');
        try {
            await refreshAllData();
            showAlert('数据已刷新', 'success');
        } catch (error) {
            console.error('刷新数据错误:', error);
            showAlert('刷新失败，请重试', 'error');
        } finally {
            hideLoading();
        }
    }

    // 刷新所有数据
    async function refreshAllData() {
        await Promise.all([
            loadTodayStats(),
            loadRecentRecords(),
            loadDailyData(parseInt(elements.dayRange?.value || CONFIG.DEFAULT_DAYS_RANGE)),
            loadTypeStats(parseInt(elements.typeStatsRange?.value || CONFIG.DEFAULT_DAYS_RANGE))
        ]);
    }

    // 加载今日统计
    async function loadTodayStats() {
        try {
            const dateStr = formatDate(currentRecordsDate);
            const [statsResponse, typesResponse] = await Promise.all([
                fetchDataFromAPI(API_ENDPOINTS.TODAY_STATS, dateStr),
                fetchDataFromAPI(API_ENDPOINTS.TODAY_TYPES_STATS, dateStr)
            ]);

            if (statsResponse.data.status === 0) {
                updateTodayStats(statsResponse.data.data[0]);
            }

            if (typesResponse.data.status === 0) {
                renderTypeStatsChart(typesResponse.data.data);
            }
        } catch (error) {
            console.error("加载今日统计错误: ", error);
            throw error;
        }
    }

    // 更新今日统计
    function updateTodayStats(data) {
        if (!data) return;

        elements.totalAmountDisplay.textContent = data.total_amount || 0;
        elements.feedCountDisplay.textContent = data.feed_count || 0;
    }

    // 加载最近记录
    async function loadRecentRecords() {
        try {
            const dateStr = formatDate(currentRecordsDate);
            const response = await fetchDataFromAPI(API_ENDPOINTS.RECENT_RECORDS, dateStr);

            if (response.data.status === 0) {
                renderRecentRecords(response.data.data);
                updateRecordsDateDisplay();
            }
        } catch (error) {
            console.error("加载最近记录错误: ", error);
            throw error;
        }
    }

    // 渲染最近记录
    function renderRecentRecords(records) {
        if (!records || records.length === 0) {
            elements.recentRecordsContainer.innerHTML = '<div class="alert alert-info">暂无记录</div>';
            return;
        }
        const result = calculateFeedingIntervals(records);
        const intervalElement = document.getElementById('avgInterval');

        if (intervalElement) {
            intervalElement.innerHTML = displayFeedingInfo(result);
        }
        // 更新热力图
        updateHeatmap(records);

        elements.recentRecordsContainer.innerHTML = records.map(record => `
        <div class="record-item" data-id="${record.id}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong class="amount">${record.amount}ml</strong>
                    <small class="text-muted ms-2 time">${formatTime(record.time)}</small>
                    ${record.typeName ? `
                        <span class="badge badge-type-${record.typeId || 5} ms-2">
                            ${record.typeName}
                        </span>
                    ` : ''}
                </div>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${record.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            ${record.notes ? `<div class="text-muted small notes mt-1">${record.notes}</div>` : ''}
        </div>
    `).join('');
    }


    function initHeatmap() {
        const chartDom = document.getElementById('timeHeatmap');
        if (!chartDom) return null;

        const chart = echarts.init(chartDom);

        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        const days = ['一', '二', '三', '四', '五', '六', '日'];

        const option = {
            tooltip: {
                position: 'top',
                formatter: function (params) {
                    return `${days[params.value[1]]} ${hours[params.value[0]]}<br/>喂养次数: ${params.value[2]}`;
                }
            },
            grid: {
                top: 30,
                left: 40,
                right: 10,
                bottom: 30
            },
            xAxis: {
                type: 'category',
                data: hours,
                splitArea: {show: true},
                axisLabel: {
                    interval: 3 // 每3小时显示一个标签
                }
            },
            yAxis: {
                type: 'category',
                data: days,
                splitArea: {show: true}
            },
            visualMap: {
                min: 0,
                max: 5,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '85%',
                inRange: {
                    color: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']
                },
                textStyle: {
                    color: '#666'
                }
            },
            series: [{
                name: '喂养次数',
                type: 'heatmap',
                data: [],
                label: {show: true},
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        chart.setOption(option);
        return chart;
    }

    async function updateHeatmap(forceRefresh = false) {
        if (!heatmapChart) return;

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0是周日，1是周一，...，6是周六
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // 设置为本周一
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // 设置为本周日

        showChartLoading(heatmapChart);

        let heatmapDataCache;
        try {
            const response = await fetchDataFromAPI(API_ENDPOINTS.HEAT_MAP, {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate)
            });

            if (response.data.status !== 0 || !response.data) {
                throw new Error('获取热力图数据失败');
            }

            // 处理并缓存数据
            heatmapDataCache = processHeatmapData(response.data);

            // 渲染数据
            renderHeatmapData(heatmapDataCache);

        } catch (error) {
            console.error('更新热力图失败:', error);
            showAlert('加载热力图数据失败', 'error');
            // 显示空状态
            heatmapChart.setOption({
                series: [{
                    data: []
                }],
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'middle',
                    style: {
                        text: '数据加载失败',
                        fill: '#999',
                        fontSize: 14
                    }
                }
            });
        } finally {
            hideChartLoading(heatmapChart);
        }
    }

// 数据处理函数
    function processHeatmapData(responseData) {
        // 直接使用后端返回的格式化数据
        return {
            data: responseData.data || [],
            maxCount: responseData.maxCount || 5
        };
    }

// 数据渲染函数
    function renderHeatmapData({data, maxCount}) {
        heatmapChart.setOption({
            series: [{
                data: data
            }],
            visualMap: {
                max: maxCount,
                inRange: {
                    color: [
                        '#ebedf0',
                        '#d0e6a5',
                        '#9dd072',
                        '#5aae61',
                        '#2e8b57'
                    ]
                },

            },
            tooltip: {
                formatter: function (params) {
                    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                    return `
                    <div style="font-weight:bold;margin-bottom:5px">
                        ${days[params.value[1]]} ${params.value[0]}:00-${params.value[0] + 1}:00
                    </div>
                    <div>
                        喂养次数: <strong style="color:#5aae61">${params.value[2]}</strong>
                    </div>
                `;
                }
            }
        });
    }

    // 格式化时间
    function formatTime(timeStr) {
        try {
            const date = new Date(timeStr);
            return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        } catch (e) {
            return timeStr;
        }
    }

    // 加载每日数据
    async function loadDailyData(days = CONFIG.DEFAULT_DAYS_RANGE) {
        showChartLoading();

        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days + 1);

            const response = await fetchDataFromAPI(API_ENDPOINTS.DAILY_STATS, {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate)
            });

            if (response.data.status === 0) {
                updateChart(response.data);
            }
        } catch (error) {
            console.error('加载每日数据失败:', error);
            showAlert('加载数据失败', 'error');
            throw error;
        } finally {
            hideChartLoading();
        }
    }

    // 更新图表数据
    function updateChart(dailyData) {

        // 1. 检查图表实例
        if (!milkChartInstance || !milkChartInstance.setOption) {
            console.error('图表实例未正确初始化');
            showAlert('图表初始化失败，请刷新页面', 'error');
            return;
        }

        // 2. 验证数据格式
        if (!dailyData || !dailyData.dates || !dailyData.amounts) {
            console.error('无效的图表数据格式:', dailyData);
            showAlert('图表数据格式不正确', 'error');

            // 显示空状态
            milkChartInstance.setOption({
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'center',
                    style: {
                        text: '无可用数据',
                        fill: '#999',
                        fontSize: 16
                    }
                }
            }, true);
            return;
        }

        // 3. 确保数据长度一致
        if (dailyData.dates.length !== dailyData.amounts.length) {
            console.error('日期和数据长度不匹配:', {
                datesLength: dailyData.dates.length,
                amountsLength: dailyData.amounts.length
            });

            // 取最小长度
            const minLength = Math.min(dailyData.dates.length, dailyData.amounts.length);
            dailyData.dates = dailyData.dates.slice(0, minLength);
            dailyData.amounts = dailyData.amounts.slice(0, minLength);
        }

        // 4. 计算7日移动平均
        const movingAvg = [];
        for (let i = 0; i < dailyData.amounts.length; i++) {
            const start = Math.max(0, i - 3);
            const end = Math.min(dailyData.amounts.length - 1, i + 3);
            const slice = dailyData.amounts.slice(start, end + 1);
            const validValues = slice.filter(v => v !== null && typeof v !== 'undefined');
            const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length || 0;
            movingAvg.push(avg.toFixed(1));
        }

        // 5. 计算整体平均值
        const validAmounts = dailyData.amounts.filter(amount =>
            typeof amount === 'number' && !isNaN(amount));
        const average = validAmounts.length > 0
            ? validAmounts.reduce((sum, val) => sum + val, 0) / validAmounts.length
            : 0;

        try {
            // 6. 更新图表配置
            const option = {
                title: {
                    subtext: `平均值: ${average.toFixed(1)} ml`
                },
                xAxis: {
                    data: dailyData.dates,
                    axisLabel: {
                        rotate: 45,
                        formatter: function (value) {
                            // 优化日期显示格式
                            if (typeof value === 'string' && value.includes('-')) {
                                const parts = value.split('-');
                                if (parts.length >= 3) {
                                    return `${parts[1]}/${parts[2]}`;
                                }
                            }
                            return value;
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '奶量(ml)',
                    min: 'dataMin',
                    max: 'dataMax'
                },
                series: [{
                    name: '每日总奶量',
                    type: 'line',
                    smooth: true,
                    data: dailyData.amounts,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            {offset: 0, color: 'rgba(128, 255, 165, 0.8)'},
                            {offset: 0.5, color: 'rgba(0, 221, 255, 0.6)'},
                            {offset: 1, color: 'rgba(55, 162, 255, 0.2)'}
                        ])
                    },
                    markPoint: {
                        data: [
                            {type: 'max', name: '最大值'},
                            {type: 'min', name: '最小值'}
                        ]
                    },
                    markLine: {
                        data: [{type: 'average', name: '平均值'}]
                    }
                }, {
                    name: '7日移动平均',
                    type: 'line',
                    smooth: true,
                    data: movingAvg,
                    lineStyle: {
                        width: 3,
                        type: 'dashed',
                        color: '#2e8b57'
                    },
                    symbol: 'none'
                }],
                tooltip: {
                    trigger: 'axis',
                    formatter: function (params) {
                        let result = params[0].axisValue + '<br/>';
                        params.forEach(param => {
                            result += `${param.marker} ${param.seriesName}: ${param.value}ml<br/>`;
                        });
                        return result;
                    }
                }
            };

            // 7. 应用配置并重绘
            milkChartInstance.setOption(option, true);
            milkChartInstance.resize();

        } catch (error) {
            console.error('更新图表时出错:', error);
            showAlert('更新图表失败: ' + error.message, 'error');
        }
    }

    // 加载喂养类型
    async function loadFeedingTypes() {
        try {
            const response = await fetchDataFromAPI(API_ENDPOINTS.FEEDING_TYPES, '');
            if (response.data.status === 0) {
                renderFeedingTypes(response.data.data);
            }
        } catch (error) {
            console.error("加载喂养类型错误: ", error);
            throw error;
        }
    }

    // 渲染喂养类型选项
    function renderFeedingTypes(types) {
        if (!types || !elements.feedingTypeSelect) return;

        elements.feedingTypeSelect.innerHTML = '<option value="">请选择喂养类型...</option>';

        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.TypeID;
            option.textContent = type.TypeName + (type.Description ? ` (${type.Description})` : '');
            elements.feedingTypeSelect.appendChild(option);
        });
    }

    // 渲染喂养类型统计图
    function renderTypeStatsChart(typeStats) {
        // 确保图表容器存在
        const chartContainer = document.getElementById('typeStatsChart');
        if (!chartContainer) return;

        // 如果图表实例不存在，则初始化
        if (!typeStatsChartInstance || typeStatsChartInstance.isDisposed()) {
            typeStatsChartInstance = echarts.init(chartContainer);
        }

        if (!typeStats || typeStats.length === 0) {
            typeStatsChartInstance.setOption({
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'center',
                    style: {
                        text: '无数据',
                        fill: '#fff',
                        opacity: 0.5,
                        fontSize: 14
                    }
                }
            });
            return;
        }
        // 按奶量排序
        typeStats.sort((a, b) => b.total_amount - a.total_amount);
        const total = typeStats.reduce((sum, stat) => sum + stat.total_amount, 0);

        // 根据屏幕宽度调整饼图半径
        const isMobile = window.innerWidth < 768;
        const radius = isMobile ? ['40%', '60%'] : ['50%', '70%'];

        // 设置图表选项
        typeStatsChartInstance.setOption({
            backgroundColor: 'transparent',
            series: [{
                type: 'pie',
                radius: ['50%', '70%'],
                avoidLabelOverlap: false,
                label: {
                    show: true,
                    formatter: '{b}: {c}ml'
                },
                itemStyle: {
                    borderWidth: 2,
                    borderColor: '#1a3a6e'
                },
                emphasis: {
                    itemStyle: {
                        borderWidth: 3,
                        borderColor: '#fff'
                    }
                },
                data: typeStats.map((stat, index) => ({
                    value: stat.total_amount,
                    name: stat.type_name,
                    itemStyle: {
                        color: getColorForType(index),
                        borderColor: getColorForType(index)
                    }
                }))
            }]
        });

        // 渲染详细数据 - 优化移动端显示
        elements.typeStatsDetails.innerHTML = typeStats.map((stat, index) => {
            const percentage = Math.round(stat.total_amount / total * 100);
            return `
            <div class="type-stat-detail-item">
                <div class="type-stat-detail-name">
                    <span class="type-stat-detail-bullet" 
                          style="background-color: ${getColorForType(index)};
                                 box-shadow: 0 0 0 2px ${getColorForType(index)}"></span>
                    ${stat.type_name}
                </div>
                <div class="type-stat-detail-value">
                    ${stat.total_amount}ml (${percentage}%)
                </div>
            </div>
        `;
        }).join('');
    }

    // 日期导航函数
    function goToPreviousDay() {
        currentRecordsDate.setDate(currentRecordsDate.getDate() - 1);
        updateRecordsDateDisplay();
        loadTodayStats();
        loadRecentRecords();
    }

    function goToToday() {
        currentRecordsDate = new Date();
        updateRecordsDateDisplay();
        loadTodayStats();
        loadRecentRecords();
    }

    function updateRecordsDateDisplay() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (currentRecordsDate.toDateString() === today.toDateString()) {
            elements.recordsDateDisplay.textContent = '今天';
        } else if (currentRecordsDate.toDateString() === yesterday.toDateString()) {
            elements.recordsDateDisplay.textContent = '昨天';
        } else {
            elements.recordsDateDisplay.textContent = currentRecordsDate.toLocaleDateString('zh-CN');
        }
    }

    // 处理窗口大小变化
    function handleWindowResize() {
        isMobileView = window.innerWidth < 768;

        if (typeStatsChartInstance && !typeStatsChartInstance.isDisposed()) {
            typeStatsChartInstance.resize();
        }


        if (milkChartInstance) {
            const chartHeight = isMobileView ? CONFIG.MOBILE_CHART_HEIGHT : CONFIG.CHART_HEIGHT;
            elements.milkChart.style.height = `${chartHeight}px`;
            milkChartInstance.resize();
        }

        if (typeStatsChartInstance) {
            typeStatsChartInstance.resize();
        }

        if (typeChart) {
            typeChart.resize();
            // 重新加载数据以应用新的响应式配置
            const days = parseInt(elements.typeStatsRange?.value || CONFIG.DEFAULT_DAYS_RANGE);
            loadTypeStats(days);
        }

        // 重新渲染类型统计图表以适应新尺寸
        if (typeStatsChartInstance) {
            const dateStr = formatDate(currentRecordsDate);
            fetchDataFromAPI(API_ENDPOINTS.TODAY_TYPES_STATS, dateStr)
                .then(response => {
                    if (response.data.status === 0) {
                        renderTypeStatsChart(response.data.data);
                    }
                });
        }
    }


    // 格式化日期
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 显示加载状态
    function showLoading(message = '加载中...') {
        elements.loadingIndicator.style.display = 'flex';
        const textEl = elements.loadingIndicator.querySelector('.loading-text');
        if (textEl) textEl.textContent = message;
    }

    function hideLoading() {
        elements.loadingIndicator.style.display = 'none';
    }

    function showChartLoading(chartInstance) {
        chartInstance && chartInstance.showLoading();
    }

    function hideChartLoading(chartInstance) {
        chartInstance && chartInstance.hideLoading();
    }

    // 显示提示
    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible position-fixed top-0 start-0 end-0 m-0 rounded-0 text-center`;
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

// 初始化应用
    initialize().then(() => {
        const toast = document.createElement('div');
        toast.className = 'position-fixed top-50 start-50 translate-middle p-2';
        toast.style.zIndex = '1100';
        toast.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show w-auto" role="alert" style="min-width: 200px;">
            <strong>数据加载完成!</strong> 
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 1000);
    });

    // 全局错误捕获
    window.addEventListener('error', function (event) {
        console.error('全局错误:', event.error);
        showAlert('发生错误，请刷新页面重试', 'error');
    });

    // 清理
    window.addEventListener('beforeunload', () => {
        if (milkChartInstance) milkChartInstance.dispose();
        if (typeStatsChartInstance) typeStatsChartInstance.dispose();
    });

});