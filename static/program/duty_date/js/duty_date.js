// duty_date.js - 最终优化版本
document.addEventListener("DOMContentLoaded", function () {
    console.log('🚀 值班日历系统启动...');

    function safeSetStyle(element, styleObj) {
        if (element && element.style) {
            Object.assign(element.style, styleObj);
        }
    }

    // DOM元素
    const elements = {
        calendarEl: document.getElementById('calendar'),
        searchInput: document.getElementById('searchInput'),
        searchButton: document.getElementById('searchButton'),
        exportBtn: document.getElementById('exportBtn'),
        resultBody: document.getElementById('resultBody'),
        tooltip: document.getElementById('tooltip'),
        resultsSection: document.querySelector('.results-section')
    };

    // 检查必需元素
    if (!elements.calendarEl) {
        console.error('❌ 关键元素缺失: #calendar');
        return;
    }

    // 全局变量
    let personData = {};
    let allEvents = [];
    let calendar = null;
    let currentSearchQuery = '';

    // ==================== 工具函数 ====================
    function showToast(message, type = 'success') {
        const toastId = 'toast-' + Date.now();
        const iconMap = { success: 'check-circle', warning: 'exclamation-triangle', danger: 'x-circle', info: 'info-circle' };
        const titleMap = { success: '成功', warning: '注意', danger: '错误', info: '提示' };
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'position-fixed top-0 end-0 p-3';
        toast.style.zIndex = '1100';
        toast.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show shadow-lg" role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-${iconMap[type] || 'info-circle'}-fill me-2"></i>
                    <div>
                        <strong>${titleMap[type] || '提示'}!</strong>
                        <div class="small">${message}</div>
                    </div>
                </div>
                <button type="button" class="btn-close" onclick="document.getElementById('${toastId}').remove()"></button>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            const el = document.getElementById(toastId);
            if (el) el.remove();
        }, 3000);
    }

    // ==================== 数据初始化 ====================
    function initData() {
        console.log('📡 正在从服务器加载数据...');

        // 显示加载状态
        showToast('正在加载数据...', 'info');

        return axios.post('/imc/customOpt', {
            req: '393',
            data: ''
        })
            .then(function (response) {
                console.log('✅ 服务器响应:', response.data);

                if (response.data && response.data.data && response.data.data.data) {
                    personData = response.data.data.data;
                    console.log('📊 解析的数据结构:', personData);

                    // 确保有默认数据
                    personData.persons = personData.persons || ['张赛三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
                    personData.leaders = personData.leaders || ['张赛领导', '李领导', '王领导'];

                    // 处理节假日数据
                    personData.holidays = Array.isArray(personData.holidays) ? personData.holidays : [
                        {date: '2026-01-01', title: '元旦'},
                        {date: '2026-01-28', title: '春节'},
                        {date: '2026-01-29', title: '春节'},
                        {date: '2026-01-30', title: '春节'},
                        {date: '2026-02-08', title: '元宵节'},
                        {date: '2026-04-04', title: '清明节'},
                        {date: '2026-05-01', title: '劳动节'},
                        {date: '2026-06-01', title: '儿童节'},
                        {date: '2026-10-01', title: '国庆节'}
                    ];

                    personData.makeupWorkDays = personData.makeupWorkDays || personData.noDutyWeekends || ['2026-01-04', '2026-04-27'];

                    console.log('✅ 数据加载完成:', {
                        人员数量: personData.persons.length,
                        领导数量: personData.leaders.length,
                        节假日数量: personData.holidays.length,
                        调休工作日: personData.makeupWorkDays.length
                    });

                    showToast(`数据加载成功: ${personData.persons.length}位人员，${personData.leaders.length}位领导`, 'success');

                    return personData;
                } else {
                    console.warn('⚠️ 服务器返回数据格式异常，使用默认数据');
                    showToast('服务器数据格式异常，使用默认数据', 'warning');
                    return initDefaultData();
                }
            })
            .catch(function (error) {
                console.error('❌ 数据加载失败:', error);
                showToast('数据加载失败! 使用默认数据，请稍后重试', 'danger');

                // 网络错误时使用默认数据
                return initDefaultData();
            });
    }

// 初始化默认数据（备用）
    function initDefaultData() {
        return {
            persons: ['张赛三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'],
            leaders: ['张赛领导', '李领导', '王领导'],
            holidays: [
                {date: '2026-01-01', title: '元旦'},
                {date: '2026-01-28', title: '春节'},
                {date: '2026-01-29', title: '春节'},
                {date: '2026-01-30', title: '春节'},
                {date: '2026-02-08', title: '元宵节'},
                {date: '2026-04-04', title: '清明节'},
                {date: '2026-05-01', title: '劳动节'},
                {date: '2026-06-01', title: '儿童节'},
                {date: '2026-10-01', title: '国庆节'}
            ],
            makeupWorkDays: ['2026-01-04', '2026-04-27']
        };
    }

    // ==================== 事件生成函数 ====================
    function generateDutyEvents(data = personData) {
        console.log('📅 生成值班事件，使用数据:', data);
        const events = [];
        // 从当前日期开始
        const startDate = new Date('2026-01-01');

        // 结束日期改为当前日期之后的90天
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);

        console.log(`📅 生成未来90天值班安排: ${startDate.toLocaleDateString('zh-CN')} 至 ${endDate.toLocaleDateString('zh-CN')}`);

        // 确保数据存在
        const persons = data.persons || personData.persons;
        const leaders = data.leaders || personData.leaders;
        const holidays = data.holidays || personData.holidays;
        const makeupWorkDays = data.makeupWorkDays || personData.makeupWorkDays;

        if (!persons || persons.length === 0) {
            console.error('❌ 没有人员数据，无法生成值班安排');
            showToast('错误：没有人员数据', 'danger');
            return events;
        }

        if (!leaders || leaders.length === 0) {
            console.warn('⚠️ 没有领导数据，使用默认值');
        }

        let personIndex = 0;
        let leaderIndex = 0;

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // 查找节假日
            const holiday = holidays.find(h => h.date === dateStr);
            const isHoliday = !!holiday;

            // 检查是否为调休工作日（周末但需要上班）
            const isWorkDay = makeupWorkDays.includes(dateStr);

            // 如果是周末/节假日且不是调休日，安排值班
            if ((isWeekend || isHoliday) && !isWorkDay) {
                const dutyPerson1 = persons[personIndex % persons.length];
                const dutyPerson2 = persons[(personIndex + 1) % persons.length];
                const leader = leaders[leaderIndex % leaders.length];

                // 生成事件标题
                let title = '';
                if (isHoliday) {
                    title = `${holiday.title}值班`;
                } else if (dayOfWeek === 0) {
                    title = '周日值班';
                } else if (dayOfWeek === 6) {
                    title = '周六值班';
                }

                // 创建事件对象
                const event = {
                    id: `duty-${dateStr}`,
                    title: title,
                    start: dateStr,
                    allDay: true,
                    extendedProps: {
                        type: 'duty',
                        dutyPerson1: dutyPerson1,
                        dutyPerson2: dutyPerson2,
                        leader: leader,
                        isHoliday: isHoliday,
                        holidayTitle: isHoliday ? holiday.title : '',
                        dayOfWeek: dayOfWeek,
                        dateStr: dateStr
                    },
                    display: 'block',
                    backgroundColor: isHoliday ? '#fc5c7d' : '#4a6cf7',
                    borderColor: isHoliday ? '#fc5c7d' : '#4a6cf7',
                    textColor: '#ffffff',
                    className: isHoliday ? 'holiday-event' : 'duty-event'
                };

                events.push(event);

                // 更新索引
                personIndex += 2;
                leaderIndex += 1;
            }
            // 如果是调休工作日
            else if (isWorkDay) {
                events.push({
                    id: `work-${dateStr}`,
                    title: '调休上班',
                    start: dateStr,
                    allDay: true,
                    extendedProps: {type: 'work'},
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    textColor: '#ffffff',
                    className: 'work-event'
                });
            }

            // 添加纯节假日标注（无值班）
            if (isHoliday && !events.some(e => e.start === dateStr)) {
                events.push({
                    id: `holiday-${dateStr}`,
                    title: holiday.title,
                    start: dateStr,
                    allDay: true,
                    extendedProps: {type: 'holiday'},
                    backgroundColor: '#f59e0b',
                    borderColor: '#f59e0b',
                    textColor: '#ffffff',
                    className: 'holiday-only-event'
                });
            }
        }

        console.log(`✅ 生成 ${events.length} 个事件`);
        allEvents = events;
        return events;
    }

    // ==================== 日历初始化 ====================
    function initCalendar() {
        try {
            console.log('🔄 初始化FullCalendar...');

            const currentDate = new Date();
            console.log('📅 当前日期:', currentDate.toLocaleDateString('zh-CN'));

            // 生成事件数据
            const events = generateDutyEvents();

            // 创建日历实例
            calendar = new FullCalendar.Calendar(elements.calendarEl, {
                // 基本配置
                initialView: 'dayGridMonth',
                locale: 'zh-cn',
                firstDay: 1, // 周一为第一天
                initialDate: currentDate,
                height: 'auto',
                contentHeight: 'auto',
                aspectRatio: 1.5,
                showNonCurrentDates: true,
                fixedWeekCount: false,
                expandRows: true,


                // 工具栏
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                },

                buttonText: {
                    today: '今天',
                    month: '月视图',
                    week: '周视图',
                    day: '日视图'
                },

                // 事件配置
                events: events,
                eventDisplay: 'block',
                eventOrder: 'title',
                dayMaxEvents: 3,
                dayMaxEventRows: 3,

                // 日期渲染
                dayCellContent: function (info) {
                    const cell = document.createElement('div');
                    cell.className = 'fc-daygrid-day-number';
                    cell.textContent = info.dayNumberText;

                    // 标记今天
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (info.date.getTime() === today.getTime()) {
                        cell.style.color = '#4a6cf7';
                        cell.style.fontWeight = 'bold';
                    }

                    return {domNodes: [cell]};
                },

                // 事件渲染
                eventDidMount: function (info) {
                    const eventEl = info.el;
                    const event = info.event;
                    const props = event.extendedProps;
                    let tooltipTimeout;

                    // 高亮"张赛"姓人员
                    if (props.type === 'duty') {
                        const hasZhang = props.dutyPerson1.includes('张赛') || props.dutyPerson2.includes('张赛') || props.leader.includes('张赛');
                        if (hasZhang) {
                            eventEl.classList.add('highlight-zhang');
                            eventEl.style.boxShadow = '0 0 0 2px #ef4444, 0 4px 8px rgba(239,68,68,0.3)';

                            // 添加SVG星星标记
                            const star = document.createElement('div');
                            star.className = 'zhang-star';
                            star.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFA500" stroke-width="1">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            `;
                            star.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                animation: star-twinkle 1.2s ease-in-out infinite alternate;
                filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.8));
            `;
                            eventEl.appendChild(star);
                        }
                    }

                    // 鼠标悬停显示工具提示
                    eventEl.addEventListener('mouseover', function (e) {
                        cancelAnimationFrame(tooltipTimeout);

                        if (elements.tooltip) {
                            // 构建详细内容
                            let tooltipContent = `<strong>${event.title}</strong>`;
                            if (props.type === 'duty') {
                                tooltipContent += `<br>日期: ${props.dateStr}`;
                                tooltipContent += `<br>值班人员: ${props.dutyPerson1}, ${props.dutyPerson2}`;
                                tooltipContent += `<br>值班领导: ${props.leader}`;
                                if (props.holidayTitle) {
                                    tooltipContent += `<br>节假日: ${props.holidayTitle}`;
                                }
                            }
                            elements.tooltip.innerHTML = tooltipContent;

                            // 确保工具提示显示
                            safeSetStyle(elements.tooltip, {
                                display: 'block',
                                opacity: '1'
                            });

                            tooltipTimeout = requestAnimationFrame(() => {
                                const tooltipRect = elements.tooltip.getBoundingClientRect();
                                const viewportWidth = window.innerWidth;
                                const viewportHeight = window.innerHeight;

                                // 计算位置
                                let top = e.clientY + 10; // 在鼠标下方10px
                                let left = e.clientX + 10; // 在鼠标右侧10px

                                // 边界检查
                                if (top + tooltipRect.height > viewportHeight - 10) {
                                    top = e.clientY - tooltipRect.height - 10; // 显示在鼠标上方
                                }
                                if (left + tooltipRect.width > viewportWidth - 10) {
                                    left = e.clientX - tooltipRect.width - 10; // 显示在鼠标左侧
                                }

                                // 确保不超出屏幕
                                top = Math.max(10, Math.min(top, viewportHeight - tooltipRect.height - 10));
                                left = Math.max(10, Math.min(left, viewportWidth - tooltipRect.width - 10));

                                safeSetStyle(elements.tooltip, {
                                    left: `${left}px`,
                                    top: `${top}px`,
                                    display: 'block'
                                });
                            }, 50); // 减少延迟
                        }
                    });

                    eventEl.addEventListener('mousemove', function (e) {
                        if (elements.tooltip && elements.tooltip.style.display === 'block') {
                            const tooltipRect = elements.tooltip.getBoundingClientRect();
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;

                            // 计算位置
                            let top = e.clientY + 10;
                            let left = e.clientX + 10;

                            // 边界检查
                            if (top + tooltipRect.height > viewportHeight - 10) {
                                top = e.clientY - tooltipRect.height - 10;
                            }
                            if (left + tooltipRect.width > viewportWidth - 10) {
                                left = e.clientX - tooltipRect.width - 10;
                            }

                            // 确保不超出屏幕
                            top = Math.max(10, Math.min(top, viewportHeight - tooltipRect.height - 10));
                            left = Math.max(10, Math.min(left, viewportWidth - tooltipRect.width - 10));

                            safeSetStyle(elements.tooltip, {
                                left: `${left}px`,
                                top: `${top}px`
                            });
                        }
                    });

                    // 鼠标离开隐藏工具提示
                    eventEl.addEventListener('mouseout', function () {
                        cancelAnimationFrame(tooltipTimeout);
                        if (elements.tooltip) {
                            safeSetStyle(elements.tooltip, {
                                display: 'none',
                                opacity: '0'
                            });
                        }
                    });

                    // 点击事件
                    eventEl.addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (props.type === 'duty') {
                            showEventDetails(event);
                        }
                    });
                },

                // 日期点击
                dateClick: function (info) {
                    console.log('📅 点击日期:', info.dateStr);
                    // 可以添加日期操作功能
                },

                // 视图变化
                datesSet: function (info) {
                    console.log('🔄 视图变化:', info.startStr, '至', info.endStr);
                    if (!window.calendarInitialized) {
                        window.calendarInitialized = true;
                        console.log('📅 日历初始视图设置完成');
                    }
                }
            });

            // 渲染日历
            calendar.render();
            console.log('✅ 日历渲染完成');

            window.calendarInitialized = true;

            // 强制更新尺寸
            setTimeout(() => calendar.updateSize(), 100);

            return calendar;

        } catch (error) {
            console.error('❌ 日历初始化失败:', error);
            elements.calendarEl.innerHTML = `
                <div class="text-center p-5">
                    <i class="bi bi-calendar-x-fill text-danger" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">日历加载失败</h4>
                    <p class="text-muted">${error.message}</p>
                    <button id="calendarReloadBtn" class="btn btn-primary mt-3">
                        <i class="bi bi-arrow-clockwise"></i> 重新加载
                    </button>
                </div>
            `;
            document.getElementById('calendarReloadBtn').addEventListener('click', function() {
                location.reload();
            });
            return null;
        }
    }

    // ==================== 搜索功能 ====================
    function initSearch() {
        if (!elements.searchButton || !elements.searchInput) return;

        // 搜索按钮点击
        elements.searchButton.addEventListener('click', performSearch);

        // 输入框回车搜索
        elements.searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performSearch();
        });

        // 搜索历史记忆
        if (localStorage.getItem('lastSearch')) {
            elements.searchInput.value = localStorage.getItem('lastSearch');
        }

        function performSearch() {
            const query = elements.searchInput.value.trim();

            if (!query) {
                showToast('请输入要查询的姓名', 'warning');
                elements.searchInput.focus();
                return;
            }

            // 保存搜索历史
            localStorage.setItem('lastSearch', query);
            currentSearchQuery = query;

            // 执行搜索
            const results = searchDutyEvents(query);

            // 更新结果表格
            updateSearchResults(results, query);

            // 高亮日历事件
            highlightSearchResults(query, false);

        }
    }

    function searchDutyEvents(query) {
        return allEvents.filter(event => {
            const props = event.extendedProps;
            if (props.type !== 'duty') return false;

            return (props.dutyPerson1 && props.dutyPerson1.includes(query)) ||
                (props.dutyPerson2 && props.dutyPerson2.includes(query)) ||
                (props.leader && props.leader.includes(query));
        });
    }

    function updateSearchResults(events, query) {
        if (!elements.resultBody) return;

        if (events.length === 0) {
            elements.resultBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-5">
                    <i class="bi bi-search text-muted" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i>
                    <div class="text-muted">未找到 "${query}" 的值班记录</div>
                </td>
            </tr>
        `;
            return;
        }

        let html = '';
        const dutyEvents = events.filter(e => e.extendedProps.type === 'duty');

        // 分离未来事件和过去事件
        const now = new Date();
        now.setHours(0, 0, 0, 0); // 设置为今天开始

        const futureEvents = [];
        const pastEvents = [];

        dutyEvents.forEach(event => {
            const eventDate = new Date(event.start);
            eventDate.setHours(0, 0, 0, 0);

            if (eventDate >= now) {
                futureEvents.push(event);
            } else {
                pastEvents.push(event);
            }
        });

        // 对事件进行排序：未来的按时间升序，过去的按时间降序
        futureEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        pastEvents.sort((a, b) => new Date(b.start) - new Date(a.start));

        // 合并数组：未来事件在前，过去事件在后
        const sortedEvents = [...futureEvents, ...pastEvents];

        sortedEvents.forEach(event => {
            const props = event.extendedProps;
            const date = new Date(event.start);
            const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
            const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const weekDay = weekDays[date.getDay()];

            // 判断是否过期
            const eventDate = new Date(date);
            eventDate.setHours(0, 0, 0, 0);
            const isExpired = eventDate < now;

            // 判断高亮
            const isDutyPerson1 = props.dutyPerson1.includes(query);
            const isDutyPerson2 = props.dutyPerson2.includes(query);
            const isLeader = props.leader.includes(query);

            // 判断是否在当前显示范围内
            const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            const isNextMonth = date.getMonth() === (now.getMonth() + 1) % 12 &&
                date.getFullYear() === (now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear());

            let monthBadge = '';
            if (isCurrentMonth) {
                monthBadge = '<span class="badge bg-success ms-2">本月</span>';
            } else if (isNextMonth) {
                monthBadge = '<span class="badge bg-primary ms-2">下月</span>';
            }

            // 添加过期标记
            let expiredBadge = '';
            if (isExpired) {
                expiredBadge = '<span class="badge bg-secondary ms-2">已过期</span>';
            }

            html += `
            <tr class="search-result-row ${isExpired ? 'table-secondary text-muted' : ''}">
                <td>
                    <div class="${isExpired ? 'text-decoration-line-through' : 'fw-bold'}">
                        ${dateStr} ${monthBadge} ${expiredBadge}
                    </div>
                    <div class="small ${isExpired ? 'text-muted' : 'text-muted'}">${weekDay}</div>
                </td>
                <td>
                    ${props.holidayTitle ? `<span class="badge ${isExpired ? 'bg-light text-dark border' : 'bg-danger'}">${props.holidayTitle}</span>` :
                date.getDay() === 0 ? `<span class="badge ${isExpired ? 'bg-light text-dark border' : 'bg-info'}">周日</span>` :
                    date.getDay() === 6 ? `<span class="badge ${isExpired ? 'bg-light text-dark border' : 'bg-primary'}">周六</span>` :
                        `<span class="badge ${isExpired ? 'bg-light text-dark border' : 'bg-secondary'}">工作日</span>`}
                </td>
                <td>
                    <span class="${isDutyPerson1 ? (isExpired ? 'text-secondary' : 'text-primary fw-bold') : ''}">${props.dutyPerson1}</span>，
                    <span class="${isDutyPerson2 ? (isExpired ? 'text-secondary' : 'text-primary fw-bold') : ''}">${props.dutyPerson2}</span>
                </td>
                <td class="${isLeader ? (isExpired ? 'text-secondary' : 'text-primary fw-bold') : ''}">${props.leader}</td>
            </tr>
        `;
        });

        elements.resultBody.innerHTML = html;

        // 在表格底部添加分割线区分未来和过去
        if (futureEvents.length > 0 && pastEvents.length > 0) {
            const rows = elements.resultBody.querySelectorAll('tr');
            if (rows[futureEvents.length]) {
                const separatorRow = document.createElement('tr');
                separatorRow.innerHTML = `
                <td colspan="4" class="py-2 border-top border-3">
                    <div class="text-center small text-muted">
                        <i class="bi bi-clock-history me-1"></i>以下为历史值班记录
                    </div>
                </td>
            `;
                elements.resultBody.insertBefore(separatorRow, rows[futureEvents.length]);
            }
        }

        // 添加行点击效果
        document.querySelectorAll('.search-result-row').forEach(row => {
            row.addEventListener('click', function () {
                const dateText = this.cells[0].querySelector('.fw-bold, .text-decoration-line-through').textContent;
                const date = new Date(dateText.replace(/[年月]/g, '/').replace('日', '').split(' ')[0]);
                if (calendar && !isNaN(date.getTime())) {
                    calendar.gotoDate(date);
                }
            });
        });
    }

    function highlightSearchResults(query, shouldGotoFirst = true) {
        if (!calendar) return;

        // 移除之前的高亮
        calendar.getEvents().forEach(event => {
            const el = event._def.el;
            if (el) {
                el.classList.remove('search-highlight');
                el.style.border = '';
            }
        });

        // 高亮搜索结果
        const results = searchDutyEvents(query);
        results.forEach(event => {
            const fcEvent = calendar.getEventById(event.id);
            if (fcEvent) {
                const el = fcEvent._def.el;
                if (el) {
                    el.classList.add('search-highlight');
                    el.style.border = '2px solid #10b981';
                    el.style.borderRadius = '4px';
                }
            }
        });

        // 只有在明确指定时才跳转到第一个结果
        if (shouldGotoFirst && results.length > 0) {
            calendar.gotoDate(results[0].start);
        }
    }

    // ==================== 导出功能 ====================
    function initExport() {
        if (!elements.exportBtn) return;

        elements.exportBtn.addEventListener('click', function () {
            try {
                const dutyEvents = allEvents.filter(e => e.extendedProps.type === 'duty');

                if (dutyEvents.length === 0) {
                    showToast('没有值班数据可导出', 'warning');
                    return;
                }

                // 创建导出数据
                const exportData = [
                    ['数智中心值班安排表'],
                    ['导出时间: ' + new Date().toLocaleString('zh-CN')],
                    [],
                    ['日期', '星期', '节假日', '值班人员1', '值班人员2', '值班领导', '备注']
                ];

                dutyEvents.forEach(event => {
                    const props = event.extendedProps;
                    const date = new Date(event.start);
                    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

                    exportData.push([
                        `${date.getMonth() + 1}月${date.getDate()}日`,
                        weekDays[date.getDay()],
                        props.holidayTitle || '',
                        props.dutyPerson1,
                        props.dutyPerson2,
                        props.leader,
                        ''
                    ]);
                });

                // 创建Excel
                const ws = XLSX.utils.aoa_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "值班安排");

                // 合并标题行
                ws['!merges'] = [
                    {s: {r: 0, c: 0}, e: {r: 0, c: 6}},
                    {s: {r: 1, c: 0}, e: {r: 1, c: 6}}
                ];

                // 设置列宽
                ws['!cols'] = [
                    {wch: 12}, // 日期
                    {wch: 8},  // 星期
                    {wch: 15}, // 节假日
                    {wch: 12}, // 人员1
                    {wch: 12}, // 人员2
                    {wch: 12}, // 领导
                    {wch: 20}  // 备注
                ];

                // 导出文件
                const fileName = `数智中心${new Date().getFullYear()}年值班安排.xlsx`;
                XLSX.writeFile(wb, fileName);

                showToast(`成功导出 ${dutyEvents.length} 条记录`, 'success');

            } catch (error) {
                console.error('❌ 导出失败:', error);
                showToast('导出失败: ' + error.message, 'danger');
            }
        });
    }

    // ==================== 辅助函数 ====================
    function showEventDetails(event) {
        const props = event.extendedProps;
        const date = new Date(event.start);

        // 使用 HTML 中已有的静态 modal 模板，只更新内容
        document.getElementById('modal-date').textContent = date.toLocaleDateString('zh-CN');
        document.getElementById('modal-weekday').textContent = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        document.getElementById('modal-holiday').textContent = props.holidayTitle || '无';
        document.getElementById('modal-persons').innerHTML =
            '<div class="d-flex justify-content-between"><span>' + props.dutyPerson1 + '</span><span>' + props.dutyPerson2 + '</span></div>';
        document.getElementById('modal-leader').textContent = props.leader;

        const modal = new bootstrap.Modal(document.getElementById('eventModal'));
        modal.show();
    }

    // ==================== 初始化应用 ====================
    function initApp() {
        console.log('🎯 初始化值班日历应用...');

        // 显示全局加载状态
        const loadingOverlay = createLoadingOverlay();

        // 1. 从服务器加载数据
        initData()
            .then(function (loadedData) {
                console.log('📦 使用数据:', loadedData);

                // 2. 生成事件数据
                allEvents = generateDutyEvents(loadedData);

                // 3. 初始化日历
                const calendarInstance = initCalendar();

                if (calendarInstance) {
                    // 4. 初始化搜索功能
                    initSearch();

                    // 5. 初始化导出功能
                    initExport();

                    // 6. 自动搜索示例
                    setTimeout(() => {
                        if (elements.searchInput) {
                            // 如果有姓"张赛"的人员，自动搜索
                            const hasZhang = loadedData.persons.some(p => p.includes('张赛')) ||
                                loadedData.leaders.some(l => l.includes('张赛'));
                            if (hasZhang) {
                                elements.searchInput.value = '张赛';
                                if (elements.searchButton) {
                                    elements.searchButton.click();
                                }
                            } else if (loadedData.persons.length > 0) {
                                // 否则搜索第一个人
                                elements.searchInput.value = loadedData.persons[0].substring(0, 1);
                                if (elements.searchButton) {
                                    elements.searchButton.click();
                                }
                            }
                        }
                    }, 500);

                    console.log('✅ 应用初始化完成');
                    showToast('值班日历系统已就绪', 'success');
                }
            })
            .catch(function (error) {
                console.error('❌ 应用初始化失败:', error);
                showToast('系统初始化失败，请刷新页面重试', 'danger');
            })
            .finally(function () {
                // 移除加载遮罩
                if (loadingOverlay && loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            });

    }

// 创建加载遮罩
    function createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(5px);
    `;

        overlay.innerHTML = `
        <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">加载中...</span>
        </div>
        <div class="mt-3 text-primary" style="font-weight: 600; font-size: 1.1rem;">
            正在加载值班数据...
        </div>
        <div class="mt-2 text-muted small">
            从服务器获取最新的人员和节假日安排
        </div>
    `;

        document.body.appendChild(overlay);
        return overlay;
    }

    // ==================== 启动应用 ====================
    // 等待所有资源加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }


});