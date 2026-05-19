/**
 * 时间线模板模块
 * 负责创建时间线项目的HTML模板和相关组件
 * 使用模板缓存机制提高性能，支持不同阶段的定制化内容展示
 */
import {getAppState} from '../appState.js';
import {getStatusStyles} from './timelineDataProcessor.js';
import {formatDate} from './timelineDomHelper.js';
import {ROLES, STATUS} from '../constants.js';
import {TimelineManager} from './timelineManager.js';

// 使用WeakMap缓存已创建的模板，避免重复DOM操作提升性能
const templateCache = new WeakMap();

/**
 * 创建时间线项目元素
 * @param {Object} data - 时间线项目数据
 * @param {string} role - 当前用户角色
 * @returns {HTMLElement|null} - 创建的时间线元素或null
 */
export function createTimelineItem(data, role) {
    if (!data.stage_name) return null;

    // 使用WeakMap缓存已创建的模板
    if (templateCache.has(data)) {
        return templateCache.get(data).cloneNode(true);
    }

    const {statusClass, badgeClass} = getStatusStyles(data.status);
    const template = document.createElement('template');

    template.innerHTML = `
    <div class="timeline-item">
        <div class="timeline-point ${statusClass}"></div>
        <div class="content-card">
            <h6 class="mb-2 fw-bold d-flex align-items-center">
                ${data.stage_name}
                ${createTrainingBadge(data)}
                ${createStatusBadge(data, badgeClass)}
            </h6>
            ${getStageContent(data, role, statusClass, badgeClass)}
        </div>
    </div>`;

    const element = template.content.firstElementChild;
    templateCache.set(data, template);

    return element;
}

/**
 * 创建培训徽章
 * @param {Object} data - 时间线项目数据
 * @returns {string} - 生成的徽章HTML字符串
 */
function createTrainingBadge(data) {
    const {trainingCourses, currentStage} = getAppState();
    if (data.stage_name !== "课程实训任务审核" || !trainingCourses?.length || currentStage !== "课程实训任务审核") return '';

    const isCompleted = [STATUS.APPROVED, STATUS.COMPLETED].includes(data.status);
    const badgeClass = isCompleted
        ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'
        : 'bg-danger bg-opacity-10 text-danger border bg-danger border-opacity-25';

    return `<span class="badge ${badgeClass}">已完成 ${trainingCourses.length} 门</span>`;
}

/**
 * 创建状态徽章
 * @param {Object} data - 时间线项目数据
 * @param {string} badgeClass - 徽章样式类
 * @returns {string} - 生成的徽章HTML字符串
 */
function createStatusBadge(data, badgeClass) {
    const specialStages = [
        "项目经验审核", "认证考试",
        "个人总结与自评", "认证结果",
        "课程实训任务审核"
    ];

    return specialStages.includes(data.stage_name)
        ? `<span class="badge ${badgeClass} badge-small">${data.status}</span>`
        : '';
}

/**
 * 获取阶段内容
 * @param {Object} data - 时间线项目数据
 * @param {string} role - 当前用户角色
 * @param {string} statusClass - 状态样式类
 * @param {string} badgeClass - 徽章样式类
 * @returns {string} - 生成的阶段内容HTML字符串
 */
function getStageContent(data, role, statusClass, badgeClass) {
    switch (data.stage_name) {
        case "认证学习":
            return `<p>${data.stage_description}</p>`;
        case "项目经验审核":
            return buildProjectExperience(data);
        case "认证报名":
            return buildRegistrationContent(data);
        case "认证考试":
            return buildExamContent(data, role);
        case "课程实训任务审核":
            return buildTrainingContent(data);
        case "个人总结与自评":
            return buildSelfEvaluationContent(data);
        case "认证结果":
            return buildLeanContent(data, role);
        default:
            return buildDefaultContent(data, badgeClass);
    }
}

/**
 * 构建报名内容
 * @param {Object} data - 时间线项目数据
 * @returns {string} - 生成的报名内容HTML字符串
 */
function buildRegistrationContent(data) {
    if (data.status === "已完成" || !data.start_time) {
        return `<p>${data.stage_description}</p>`;
    }

    return `
                <div class="d-flex justify-content-between align-items-center">
                  <p class="flex-grow-1 mb-0">${data.stage_description}</p>
                  <span class="badge ${getStatusStyles(data.status).badgeClass} badge-small">
                    ${data.status}
                  </span>
                </div>
                <div class="card mt-3 p-2 bg-primary text-light rounded">
                  <p class="mb-1"><strong>报名时间:</strong>
                    <span>${formatDate(data.start_time)}</span>
                  </p>
                  <p class="mb-1"><strong>审核时间:</strong>
                    <span>${formatDate(data.end_time)}</span>
                  </p>
                </div>
              `;
}

/**
 * 构建考试内容
 * @param {Object} data - 时间线项目数据
 * @param {string} role - 当前用户角色
 * @returns {string} - 生成的考试内容HTML字符串
 */
function buildExamContent(data, role) {

    // 获取考试显示信息
    const examDisplayInfo = getExamDisplayInfo(data);
    const canViewCert = canViewCertificate(data, role);
    const resultColorClass = getStatusColorClass(data.exam_result);

    return `
        <div class="mt-2">
            ${examDisplayInfo.showExamInfo ? buildExamTimeLocation(data) : ''}
            ${examDisplayInfo.showScore ? buildExamScore(data, resultColorClass) : ''}
            ${canViewCert ? buildCertificateButton() : ''}
        </div>
    `;
}

/**
 * 获取状态颜色类
 * @param {string} status - 状态值
 * @returns {string} - 生成的颜色样式类
 */
function getStatusColorClass(status) {
    switch (status) {
        case "已审核":
        case STATUS.APPROVED:
            return "text-success";
        case "未审核":
        case "审核中":
            return "text-warning";
        case STATUS.REJECTED:
        case "审核不通过":
            return "text-danger";
        default:
            return "text-secondary";
    }
}

/**
 * 检查是否可以查看证书
 * @param {Object} data - 时间线项目数据
 * @param {string} role - 当前用户角色
 * @returns {boolean} - 是否可以查看证书
 */
function canViewCertificate(data, role) {
    const {nowRole, userStatus} = getAppState();

    if (role === ROLES.LEAN_BACKBONE && nowRole === ROLES.LEAN_COACH) {
        return data.stage_name === "认证结果";
    }

    if ((role === ROLES.LEAN_COACH || role === ROLES.LEAN_BACKBONE) && nowRole === ROLES.SENIOR_COACH) {
        return data.stage_name === "认证结果";
    }

    if (role === ROLES.LEAN_BACKBONE || role === ROLES.LEAN_COACH || role === ROLES.SENIOR_COACH) {
        return data.stage_name === "认证结果" && userStatus;
    }

    if (role === ROLES.LEAN_STUDENT) {
        return data.stage_name === "认证考试" && (nowRole !== ROLES.LEAN_STUDENT || userStatus);
    }
    return false;
}


/**
 * 获取考试显示信息
 * @param {Object} data - 时间线项目数据
 * @returns {Object} - 包含显示信息的对象
 */
function getExamDisplayInfo(data) {
    const examResult = data.exam_result || "未开始";
    const examScore = !data.exam_score || data.exam_score === "-" ? 0 : data.exam_score;


    if (examResult === "已通过") {
        return {showExamInfo: false, showScore: true};
    }

    if (examResult === "未开始") {
        return {showExamInfo: false, showScore: false};
    }

    if (examResult === "未通过" && examScore >= 0) {
        return {showExamInfo: false, showScore: true};
    }

    if (examResult === "未开始" && examScore >= 0) {
        return {showExamInfo: false, showScore: true};
    }

    if (examResult === "已开始" && examScore >= 0) {
        return {showExamInfo: true, showScore: false};
    }

    const shouldHideExamInfo = examScore <= 0 &&
        (examResult === "未通过" || examResult === "已开始");

    const shouldShowScore = examScore > 0 && (examResult === "已通过" || examResult === "未通过");

    return {
        showExamInfo: shouldHideExamInfo,
        showScore: shouldShowScore
    };
}

/**
 * 构建考试时间和地点内容
 * @param {Object} data - 时间线项目数据
 * @returns {string} - 生成的考试时间地点HTML字符串
 */
function buildExamTimeLocation(data) {
    // 处理考试时间信息
    let examDateInfo = "暂未安排";
    let examTimeRange = "";
    let daysLeftInfo = "";
    let daysLeftClass = "text-muted";
    let cardBorderClass = "border-primary";
    let cardShadowClass = "shadow-sm";
    let pulseAnimation = "";

    if (data.exam_time) {
        // 解析考试时间
        const [datePart, timePart] = data.exam_time.split(' ');
        const [startTime, endTime] = timePart.split('-');
        const [year, month, day] = datePart.split('-').map(Number);

        // 创建考试日期对象
        const examDate = new Date(year, month - 1, day);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        examDate.setHours(startHour, startMinute, 0, 0);

        // 获取星期几
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[examDate.getDay()];

        // 计算当前时间和关键时间点
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // 明天零点

        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(tomorrow.getDate() + 1); // 后天零点

        // 格式化日期和时间显示
        examDateInfo = `${year}年${month}月${day}日 <span class="text-secondary">(周${weekday})</span>`;
        examTimeRange = `${startTime}-${endTime}`;

        // 智能判断剩余时间
        if (examDate >= dayAfterTomorrow) {
            // 后天或更晚
            const daysLeft = Math.floor((examDate - now) / (1000 * 60 * 60 * 24));
            if (daysLeft === 2) {
                daysLeftInfo = "后天";
                daysLeftClass = "text-warning";
                cardBorderClass = "border-warning";
            } else if (daysLeft > 7) {
                daysLeftInfo = `${daysLeft}天后`;
                daysLeftClass = "text-success";
                cardBorderClass = "border-success";
            } else {
                daysLeftInfo = `${daysLeft}天后`;
                daysLeftClass = "text-primary";
            }
        } else if (examDate >= tomorrow) {
            // 明天
            daysLeftInfo = "明天";
            daysLeftClass = "text-info fw-bold";
            cardBorderClass = "border-info";
            cardShadowClass = "shadow";
            pulseAnimation = "animate-pulse";
        } else if (examDate > now) {
            // 今天内
            const hoursLeft = Math.floor((examDate - now) / (1000 * 60 * 60));
            const minutesLeft = Math.floor((examDate - now) / (1000 * 60)) % 60;
            if (hoursLeft > 0) {
                daysLeftInfo = minutesLeft > 0 ? `${hoursLeft}小时${minutesLeft}分钟后` : `${hoursLeft}小时后`;
            } else {
                daysLeftInfo = `${minutesLeft}分钟后`;
            }
            daysLeftClass = "text-danger fw-bold";
            cardBorderClass = "border-danger";
            cardShadowClass = "shadow-lg";
            pulseAnimation = "animate-pulse";
        } else {
            // 已过期
            return "";
        }
    }

    return `
    <div class="card  p-2 mt-4 mb-3  ${cardBorderClass} border-opacity-25 ${cardShadowClass} ${pulseAnimation}" 
         style="border-radius: 16px; border-width: 2px; transition: all 0.3s ease;">
        <div class="d-flex align-items-center mb-3">
            <div class="bg-primary bg-opacity-10 p-2 rounded-circle me-2 d-flex align-items-center justify-content-center" 
                 style="width: 40px; height: 40px;">
                <i class="bi bi-calendar-event fs-5 text-primary"></i>
            </div>
            <h6 class="mb-0 fw-bold text-primary">考试信息</h6>
        </div>
        
        <div class="d-flex align-items-start mb-3">
            <div class="bg-light p-2 rounded-circle me-2 d-flex align-items-center justify-content-center" 
                 style="width: 36px; height: 36px;">
                <i class="bi bi-clock-history text-primary"></i>
            </div>
            <div class="flex-grow-1">
                <p class="mb-1 small text-muted">考试时间</p>
                <div class="d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <p class="mb-0 fw-semibold fs-6">${examDateInfo}</p>
                        <span class="badge ${daysLeftClass} bg-opacity-10 py-1" 
                              style="border-radius: 12px; font-size: 0.75rem;">${daysLeftInfo}</span>
                    </div>
                    <p class="mb-0 fw-semibold fs-5 text-dark mt-1">${examTimeRange}</p>
                </div>
            </div>
        </div>
        
        <div class="d-flex align-items-start">
            <div class="bg-light p-2 rounded-circle me-2 d-flex align-items-center justify-content-center" 
                 style="width: 36px; height: 36px;">
                <i class="bi bi-geo-alt text-primary"></i>
            </div>
            <div>
                <p class="mb-1 small text-muted">考试地点</p>
                <p class="mb-0 fw-semibold fs-6 text-dark">${data.exam_location || "暂未安排"}</p>
            </div>
        </div>
        
        <!-- 添加装饰元素 -->
        <div class="position-absolute top-0 end-0 mt-2 me-3">
            <div class="bg-primary bg-opacity-10 rounded-circle p-1"></div>
        </div>
        <div class="position-absolute bottom-0 start-0 mb-2 ms-3">
            <div class="bg-primary bg-opacity-10 rounded-circle p-1"></div>
        </div>
    </div>
    `;
}


/**
 * 构建考试成绩内容
 * @param {Object} data - 时间线项目数据
 * @param {string} resultColorClass - 结果颜色样式类
 * @returns {string} - 生成的考试成绩HTML字符串
 */
function buildExamScore(data, resultColorClass) {
    const currentName = getAppState().currentName;

    if (currentName !== "认证考试") {
        return "";
    }
    // 根据分数设置不同的图标和背景
    const scoreIcon = data.exam_score >= 60 ?
        'bi-check-circle-fill text-success' :
        'bi-exclamation-circle-fill text-danger';

    const scoreBgClass = data.exam_score ?
        (data.exam_score >= 60 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') :
        'bg-secondary bg-opacity-10';

    // 检查是否为通过状态
    const isPassed = data.exam_result === STATUS.APPROVED;
    let animationClass = isPassed ? 'trigger-confetti' : 'exam-failed-indicator';

    if (data.exam_result !== STATUS.APPROVED && data.exam_result !== STATUS.REJECTED) {
        animationClass = ''
    }

    return `
    <div class="card border-0 ${scoreBgClass} p-3 mb-3">
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <div>
                    <p class="mb-0 small text-muted">考试成绩</p>
                    <h5 class="mb-0 fw-bold">${data.exam_score || '--'} 分</h5>
                </div>
            </div>
            
            <div class="text-end">
                ${data.exam_score ? `
                <div class="d-flex align-items-center ${resultColorClass}">
                    <i class="bi ${scoreIcon} me-2"></i>
                    <span class="fw-medium">${data.exam_result || '--'}</span>
                </div>
                ` : `
                <div class="text-secondary">
                    <i class="bi bi-dash-circle"></i>
                    <span>无结果</span>
                </div>
                `}
            </div>
        </div>
    </div>
    `;
}

/**
 * 构建证书按钮
 * @returns {string} - 生成的证书按钮HTML字符串
 */
function buildCertificateButton() {
    const {userFID, tabRole} = getAppState();
    return `
        <button 
            type="button" 
            class="btn btn-sm btn-primary rounded-3 px-3 show-modal-btn"
            onclick="location.href='zhengshu.html?userName=${userFID}&tabRole=${tabRole}'">
            <i class="bi bi-file-text me-2"></i>查看证书
        </button>
    `;
}

/**
 * 构建项目经验内容
 * @param {Object} data - 时间线项目数据
 * @returns {string} - 生成的项目经验HTML字符串
 */
function buildProjectExperience(data) {
    const {userIntroData} = getAppState();

    // 如果状态是已通过或待审核，不显示额外内容
    if ([STATUS.APPROVED].includes(data.status)) {
        return '';
    }

    // 进行中显示填写的内容 - 使用新的样式类
    if (data.status === STATUS.IN_PROGRESS && data.reason) {
        return `
            <div class="card border-warning border-opacity-25 shadow-sm mb-3 animate-pulse" 
                 style="border-radius: 12px; border-left-width: 4px;">
                <div class="card-body p-3">
                    <div class="d-flex align-items-center mb-2">
                        <div class="bg-warning bg-opacity-10 p-2 rounded-circle me-2">
                            <i class="bi bi-clock-history text-warning"></i>
                        </div>
                        <span class="mb-0 text-gradient fw-bold pulse-badge">审核中</span>
                    </div>
                    <div class="ps-5">
            <div class="d-flex align-items-start">
                <div class="flex-shrink-0 text-warning mt-1 me-3">
                    <i class="bi bi-arrow-right-short fs-5"></i>
                </div>
                <div>
                    <p class="mb-1 small text-muted opacity-75">项目经验：</p>
                    <p class="mb-0 text-dark fw-medium" style="line-height: 1.6;">
                        ${data.reason}
                    </p>
                </div>
            </div>
        </div>
                    <div class="mt-4 text-center">
            <div class="d-inline-flex align-items-center text-muted small px-3 py-1 rounded-pill" 
                 style="background-color: rgba(108, 117, 125, 0.1);">
                <i class="bi bi-hourglass-split me-2"></i>
                <span class="fade-in-out" style="animation: fadeInOut 2s infinite;">请耐心等待审核结果</span>
            </div>
        </div>
                </div>
            </div>
        `;
    }

    // 如果是驳回状态且包含原因
    if (data.status === STATUS.REJECTED && data.reason) {
        return `
            <div class="card border-danger border-opacity-25 shadow-sm mb-3" 
                 style="border-radius: 12px; border-left-width: 4px;">
                <div class="card-body p-3">
                    <div class="d-flex align-items-center mb-2">
                        <div class="bg-danger bg-opacity-10 p-2 rounded-circle me-2">
                            <i class="bi bi-exclamation-circle-fill text-danger"></i>
                        </div>
                        <h6 class="mb-0 text-danger fw-bold">审核未通过</h6>
                    </div>
                    <div class="ps-4">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0 text-danger mt-1 me-2">
                                <i class="bi bi-arrow-right-short"></i>
                            </div>
                            <div>
                                <p class="mb-1 small text-muted">原因说明：</p>
                                <p class="mb-0 text-dark">${data.reason}</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 text-center text-danger small fw-semibold">
                        <i class="bi bi-exclamation-triangle me-1"></i> 请修改后重新提交
                    </div>
                </div>
            </div>
        `;
    }

    return '';
}


/**
 * 构建培训内容
 * @param {Object} data - 时间线项目数据
 * @returns {string} - 生成的培训内容HTML字符串
 */
function buildTrainingContent(data) {
    const {userIntroData, specialRole} = getAppState();
    if (data.status === '未开始') {
        return ' ';
    }
    // 特殊角色或未开始状态不显示内容
    if ((data.status === STATUS.APPROVED || data.status === STATUS.COMPLETED) && specialRole) {
        return ' ';
    }
    if (data.status === STATUS.APPROVED) {
        return ' ';
    }

    const button = `
        <button 
            type="button" 
            class="btn btn-sm btn-primary rounded-3 px-3 shadow-btn training-courses-btn"
            data-bs-toggle="modal" 
            data-bs-target="#trainingCoursesModal">
            <i class="bi bi-list-ul me-1"></i>查看课程明细
        </button>
    `;
    return `${buildTrainingNotice()} ${button}`;
}

/**
 * 构建培训通知内容
 * @returns {string} - 生成的培训通知HTML字符串
 */
function buildTrainingNotice() {
    return `
    <div class="alert alert-info p-2 small d-flex align-items-center mb-3">
        <i class="bi bi-info-circle-fill me-2 flex-shrink-0"></i>
        <div>
            若对课程实训任务信息存在异议，请联系精益办工作人员
            <div class="mt-1">
                <i class="bi bi-telephone me-1"></i>联系电话：<a href="tel:0538-3696956" class="text-decoration-none">0538-3696956</a>
            </div>
        </div>
    </div>
    `;
}

/**
 * 构建个人总结与自评内容
 * @param {Object} data - 时间线项目数据
 * @returns {string} - 生成的个人总结与自评HTML字符串
 */
function buildSelfEvaluationContent(data) {
    const {userIntroData, specialRole} = getAppState();
    const textXs = '1.0rem'; // 小号字体
    const textSm = '1.5rem'; // 稍大一点的字体

    // 已通过状态的显示
    if (data.status === STATUS.APPROVED ||
        (data.status === STATUS.COMPLETED && !specialRole)) {
        return `  `;
    }

    // 特殊角色或未开始状态不显示内容
    if ((data.status === STATUS.APPROVED || data.status === STATUS.COMPLETED) && specialRole) {
        return ' ';
    }

    if (data.status === STATUS.PENDING) {
        return ' ';
    }

    // 构建内容列表
    return `
    <div class="card border-0 shadow-none mt-2" style="font-size: ${textXs};">
    <div class="card-body p-2">

        <!-- 两种访问方式指引 -->
            <div class="mt-2 mb-3">
                <!-- 方法一：电脑端微信搜索 -->
                <div class="mb-2 p-2 bg-info bg-opacity-10 border border-info border-opacity-25 rounded-3"
                     style="font-size: 0.85rem;">
                    <div class="d-flex align-items-center mb-2">
                        <div class="bg-primary bg-opacity-10 rounded-circle p-1 me-2">
                            <i class="bi bi-wechat text-primary" style="font-size: 1.2rem;"></i>
                        </div>
                        <div class="fw-semibold text-primary">
                            方法一：微信搜索访问
                        </div>
                    </div>
                    <div class="ps-4 text-muted">
                        <div class="mb-1">
                            <i class="bi bi-chevron-right me-1 text-info"></i>
                            在电脑端登录微信
                        </div>
                        <div class="mb-1">
                            <i class="bi bi-chevron-right me-1 text-info"></i>
                            搜索"<span class="text-primary fw-medium">石横特钢员工一卡通</span>"
                        </div>
                        <div>
                            <i class="bi bi-chevron-right me-1 text-info"></i>
                            进入精益认证平台进行填写
                        </div>
                    </div>
                </div>
                
                <!-- 方法二：复制链接 -->
                <div class="mb-2 p-2 bg-light border rounded-3"
                     style="font-size: 0.85rem;">
                    <div class="d-flex align-items-center mb-2">
                        <div class="bg-success bg-opacity-10 rounded-circle p-1 me-2">
                            <i class="bi bi-link-45deg text-success" style="font-size: 1.2rem;"></i>
                        </div>
                        <div class="fw-semibold text-success">
                            方法二：复制链接访问
                        </div>
                    </div>
                    <div class="ps-4 text-muted">
                        <div class="mb-1">
                            <i class="bi bi-chevron-right me-1 text-success"></i>
                            点击下方"<span class="text-success fw-medium">复制页面链接</span>"按钮
                        </div>
                        <div class="mb-1">
                            <i class="bi bi-chevron-right me-1 text-success"></i>
                            在电脑浏览器中粘贴链接打开
                        </div>
                        <div>
                            <i class="bi bi-chevron-right me-1 text-success"></i>
                            快速访问此页面进行操作
                        </div>
                    </div>
                </div>
            </div>

        <!-- 复制网址按钮 -->
        <div class="text-center">
            <button
                    type="button"
                    class="btn btn-success btn-sm copy-page-url d-inline-flex align-items-center gap-2 px-3"
                    style="
                        font-size: ${textXs};
                        border-radius: 8px;
                        padding: 0.5rem 1.5rem;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    "
                    title="复制当前页面网址"
            >
                <i class="bi bi-clipboard-plus"></i>
                <span>复制页面链接去电脑端打开</span>
            </button>
        </div>
        <div class="list-group list-group-flush">
            ${userIntroData.map(item => `
            <div class="list-group-item border-0 px-0 py-1" style="font-size: ${textXs};">
                <div class="d-flex justify-content-between align-items-center">
                        <span class="${getStatusColorClass(item.status)} fw-medium">
                            ${item.name || "未命名项目"}
                        </span>
                    <span class="badge ${getStatusStyles(item.status).badgeClass}"
                          style="font-size: ${textXs}; padding: 0.25rem 0.4rem;">
                            ${item.status || "未知状态"}
                        </span>
                </div>
                ${item.status === STATUS.REJECTED && item.reason ? `
                <div class="alert alert-danger mt-1 mb-0 py-1 px-2"
                     style="font-size: ${textXs}; line-height: 1.3;">
                    <i class="bi bi-exclamation-triangle-fill me-1" style="font-size: ${textSm};"></i>
                    <strong>原因:</strong> ${item.reason}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
    </div>
</div>
    `;
}

/**
 * 构建精益认证内容
 * @param {Object} data - 时间线项目数据
 * @param {string} role - 当前用户角色
 * @returns {string} - 生成的精益认证内容HTML字符串
 */
function buildLeanContent(data, role) {
    // 基础内容部分
    let content = ``;
    const canViewCert = canViewCertificate(data, role);
    const specialRoleStatus = getAppState().specialRole;

    // 根据不同状态添加额外内容
    if (specialRoleStatus && data.status === null) {
        // 通过状态 - 特殊人
        content += ``;
    } else if (data.status === STATUS.REJECTED) {
        // 未通过状态 - 显示原因
        content += `
        <div class="card mt-3 border-start border-3 border-danger bg-danger bg-opacity-10">
            <div class="card-body p-3">
                <div class="d-flex align-items-start">
                    <i class="bi bi-exclamation-circle-fill text-danger me-2 mt-1"></i>
                    <div>
                        <h6 class="card-title text-danger mb-1">未通过原因</h6>
                        <p class="card-text mb-0">${data.certification_results || '无具体原因'}</p>
                    </div>
                </div>
            </div>
        </div>`;
    } else if (data.status === STATUS.APPROVED) {
        // 通过状态 - 显示改善意见
        content += `
        <div class="card mt-3 border-start border-3 border-success bg-success bg-opacity-10">
            <div class="card-body p-3">
                <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                    <div>
                        <h6 class="card-title text-success mb-1">改善意见</h6>
                        <p class="card-text mb-0">${data.certification_results || '无改善意见'}</p>
                    </div>
                </div>
            </div>
        </div>`;
    } else if (!canViewCert) {
        return `
        <div class="d-flex justify-content-between align-items-center p-2 rounded">
            <p>${data.stage_description}</p>
        </div>`;
    }

    // 证书按钮部分
    content += `
    <div class="mt-3 d-grid">
        ${canViewCert ? buildCertificateButton() : ''}
    </div>`;

    return content;
}


/**
 * 构建默认内容（用于非特殊阶段）
 * @param {Object} data - 时间线项目数据
 * @param {Object} options - 配置选项
 * @returns {string} - 生成的HTML内容
 */
function buildDefaultContent(data, options) {
    const {badgeClass} = options;

    // 如果有开始时间且状态不是"已通过"，显示时间卡片
    const shouldShowTimeCard = data.start_time && data.status !== STATUS.APPROVED;
    const timeCard = shouldShowTimeCard ? `
        <div class="card mt-3 p-2 bg-primary text-light rounded">
            <p class="mb-1"><strong>报名时间:</strong>
                <span>${formatDate(data.start_time)}</span>
            </p>
            ${data.end_time ? `
                <p class="mb-1"><strong>审核时间:</strong>
                    <span>${formatDate(data.end_time)}</span>
                </p>
            ` : ''}
        </div>
    ` : '';

    return `
        <div class="d-flex justify-content-between align-items-center">
            <p class="flex-grow-1 mb-0">${data.stage_description}</p>
            <span class="badge ${badgeClass} badge-small">${data.status}</span>
        </div>
        ${timeCard}
    `;
}

