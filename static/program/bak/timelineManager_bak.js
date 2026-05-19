import {STATUS, ROLES} from '../constants.js';
import {domCache} from '../domCache.js';
import {ApiService} from '../apiService.js';
import {getAppState, setAppState} from '../appState.js';
import {ButtonManager} from '../buttonManager.js';

let {userData, userStatus, specialRole} = getAppState();

export const TimelineManager = {
    generateTimeline(roleData, role) {
        domCache.timelineContainer.innerHTML = '';

        const examStage = roleData.find(item => item.stage_name === "认证考试");
        if (examStage && examStage.status === STATUS.COMPLETED) {
            domCache.timelineContainer.classList.add('completed-exam');
        } else {
            domCache.timelineContainer.classList.remove('completed-exam');
        }

        let html = '';
        roleData.forEach(item => {
            html += this.createItem(item, role);
        });
        domCache.timelineContainer.innerHTML = html;

        ButtonManager.updateSignupButton(roleData, role);
    },
    async loadAndGenerateTimeline(userName, currentRole) {
        const {
            currentData: loadedData,
            userStatus: loadedStatus
        } = await ApiService.queryUserData(userName, currentRole);
        userData = loadedData;
        userStatus = loadedStatus;
        setAppState({userData: loadedData, userStatus: loadedStatus});
        const processedData = this.handleSpecialRoleTimeline(userData);
        this.generateTimeline(processedData, currentRole);

    },
    handleSpecialRoleTimeline(timelineData) {
        const {specialRole, userStatus, nowRole, tabRole} = getAppState();

        // 如果不是特殊角色，直接返回原数据
        if (!specialRole) {
            return timelineData;
        }

        // 特殊角色用户逻辑
        if (specialRole) {
            // 情况1：用户已完成认证(userStatus=true)，显示所有已完成
            // 情况2：用户正在查看其他角色页面(nowRole!==tabRole)，显示所有已完成
            if (userStatus || nowRole !== tabRole) {
                return timelineData.map(item => ({
                    ...item,
                    status: STATUS.COMPLETED,
                    exam_result: STATUS.APPROVED,
                }));
            }

            // 情况3：用户正在进行认证(userStatus=false)且查看的是自己的页面(nowRole===tabRole)
            // 返回原始数据，显示真实状态
            return timelineData;
        }

        // 默认返回原数据
        return timelineData;
    },

    // 时间线项目创建逻辑...
    createItem(data, role) {
        // 通用创建时间线项目函数
        const {statusClass, badgeClass} = this.getStatusStyles(data.status);
        const {trainingCourses} = getAppState();

        // 初始化默认值
        let showExamInfo = false;
        let showScore = true;

        // 如果是认证考试阶段，获取特定的显示设置
        if (data.stage_name === "认证考试") {
            const examDisplayInfo = this.getExamDisplayInfo(data);
            showExamInfo = examDisplayInfo.showExamInfo;
            showScore = examDisplayInfo.showScore;
        }

        const canViewCert = this.canViewCertificate(data, role);
        const resultColorClass = this.getStatusColorClass(data.exam_result);

        // 构建阶段特定内容
        const stageSpecificContent = this.buildStageSpecificContent(data, role, {
            statusClass,
            badgeClass,
            showExamInfo,
            showScore,
            canViewCert,
            resultColorClass
        });

        // 课程实训任务徽章逻辑
        const trainingBadge = data.stage_name === "课程实训任务审核" && (trainingCourses || []).length > 0
            ? (data.status === STATUS.APPROVED || data.status === STATUS.COMPLETED)
                ? `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">已完成 ${(trainingCourses || []).length} 门</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border bg-danger border-opacity-25">已完成 ${(trainingCourses || []).length} 门</span>`
            : '';


        return `
        <div class="timeline-item">
          <div class="timeline-point ${statusClass}"></div>
          <div class="content-card">
            <h6 class="mb-2 fw-bold d-flex align-items-center">
              ${data.stage_name}
              ${trainingBadge}
              ${data.stage_name === "项目经验审核" ||
        data.stage_name === "认证考试" ||
        data.stage_name === "个人总结与自评" ||
        data.stage_name === "认证结果" ||
        data.stage_name === "课程实训任务审核"
            ? `<span class="badge ${badgeClass} badge-small">${data.status}</span>`
            : ''}
            </h6>
            ${stageSpecificContent}
          </div>
        </div>
    `;
    },
    getStatusStyles(status) {
        const statusMap = {
            "已完成": {statusClass: "completed", badgeClass: "bg-success"},
            "已通过": {statusClass: "completed", badgeClass: "bg-success"},
            "进行中": {statusClass: "in-progress", badgeClass: "bg-warning"},
            "审核中": {statusClass: "in-progress", badgeClass: "bg-warning"},
            "未开始": {statusClass: "pending", badgeClass: "bg-secondary"},
            "未通过": {statusClass: "pending", badgeClass: "bg-danger"},
            "审核不通过": {statusClass: "pending", badgeClass: "bg-danger"}
        };
        return statusMap[status] || {statusClass: "pending", badgeClass: "bg-secondary"};
    },
    getExamDisplayInfo(data) {
        // 确保有有效的考试结果值
        const examResult = data.exam_result || "未开始";
        const examScore = !data.exam_score || data.exam_score === "-" ? 0 : data.exam_score;

        // 已通过的显示考试成绩不显示考试信息
        if (examResult === "已通过") {
            return {showExamInfo: false, showScore: true};
        }

        if (examResult === "未开始") {
            return {showExamInfo: false, showScore: false};
        }

        if (examResult === "未通过" && examScore >= 0) {
            return {showExamInfo: false, showScore: true};
        }
        // 没有成绩且结果是未通过或已开始时隐藏考试信息
        const shouldHideExamInfo = examScore <= 0 &&
            (examResult === "未通过" || examResult === "已开始");

        // 有成绩且结果不是未通过时显示分数
        const shouldShowScore = examScore > 0 && examResult !== "未通过";

        return {
            showExamInfo: shouldHideExamInfo,
            showScore: shouldShowScore
        };
    },

    canViewCertificate(data, role) {
        const {nowRole, userStatus} = getAppState();

        if (role === ROLES.LEAN_BACKBONE && nowRole === ROLES.LEAN_COACH) {

            return data.stage_name === "认证结果";
        }

        if (role === ROLES.LEAN_BACKBONE || role === ROLES.LEAN_COACH) {

            return data.stage_name === "认证结果" && userStatus;
        }

        if (role === ROLES.LEAN_STUDENT) {
            return data.stage_name === "认证考试" && (nowRole !== ROLES.LEAN_STUDENT || userStatus);
        }
        return false;
    },

    getStatusColorClass(status) {
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
    },
    buildStageSpecificContent(data, role, options) {
        const {
            showExamInfo,
            showScore,
            canViewCert,
            resultColorClass
        } = options;

        switch (data.stage_name) {
            case "认证学习":
                return `<p>${data.stage_description}</p>`;
            case "项目经验审核":
                return this.buildProjectExperience(data);

            case "认证报名":
                return this.buildRegistrationContent(data);

            case "认证考试":
                return this.buildExamContent(data, showExamInfo, showScore, canViewCert, resultColorClass);

            case "课程实训任务审核":
                return this.buildTrainingContent(data, options);

            case "个人总结与自评":
                return this.buildSelfEvaluationContent(data);

            case "认证结果":
                return this.buildLeanContent(data, canViewCert);

            default:
                return this.buildDefaultContent(data, options);
        }
    },
    buildRegistrationContent(data) {
        if (data.status === "已完成" || !data.start_time) {
            return `<p>${data.stage_description}</p>`;
        }

        return `
                <div class="d-flex justify-content-between align-items-center">
                  <p class="flex-grow-1 mb-0">${data.stage_description}</p>
                  <span class="badge ${this.getStatusStyles(data.status).badgeClass} badge-small">
                    ${data.status}
                  </span>
                </div>
                <div class="card mt-3 p-2 bg-primary text-light rounded">
                  <p class="mb-1"><strong>报名时间:</strong>
                    <span>${this.formatDate(data.start_time)}</span>
                  </p>
                  <p class="mb-1"><strong>审核时间:</strong>
                    <span>${this.formatDate(data.end_time)}</span>
                  </p>
                </div>
              `;
    },

    // 构建考试内容
    buildExamContent(data, showExamInfo, showScore, canViewCert, resultColorClass) {
        return `
                <div class="mt-2">
                  ${showExamInfo ? this.buildExamTimeLocation(data) : ''}
                  ${showScore ? this.buildExamScore(data, resultColorClass) : ''}
                  ${canViewCert ? this.buildCertificateButton() : ''}
                </div>
              `;
    },

    // 辅助函数

    /**
     * 格式化日期显示
     * @param {string} dateString 日期字符串
     * @returns {string} 格式化后的日期
     */
    formatDate(dateString) {
        if (!dateString) return "暂无";

        try {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(/\//g, '-');
        } catch (e) {
            console.error("日期格式化错误:", e);
            return "暂无";
        }
    },

    buildExamTimeLocation(data) {
    return `
    <div class="card p-3 mb-3 border-primary border-opacity-25">
        <div class="d-flex align-items-center mb-2">
            <i class="bi bi-calendar-event fs-5 text-primary me-2"></i>
            <h6 class="mb-0 fw-bold">考试信息</h6>
        </div>
        
        <div class="d-flex align-items-start mb-2">
            <i class="bi bi-clock-history text-muted me-2 mt-1"></i>
            <div>
                <p class="mb-0 small text-muted">考试时间</p>
                <p class="mb-0 fw-medium">${data.exam_time || "暂未安排"}</p>
            </div>
        </div>
        
        <div class="d-flex align-items-start">
            <i class="bi bi-geo-alt text-muted me-2 mt-1"></i>
            <div>
                <p class="mb-0 small text-muted">考试地点</p>
                <p class="mb-0 fw-medium">${data.exam_location || "暂未安排"}</p>
            </div>
        </div>
    </div>
    `;
},

buildExamScore(data, resultColorClass) {
    // 根据分数设置不同的图标和背景
    const scoreIcon = data.exam_score >= 60 ?
        'bi-check-circle-fill text-success' :
        'bi-exclamation-circle-fill text-danger';

    const scoreBgClass = data.exam_score ?
        (data.exam_score >= 60 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') :
        'bg-secondary bg-opacity-10';

    return `
    <div class="card border-0 ${scoreBgClass} p-3 mb-3">
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <i class="bi bi-clipboard-data fs-4 text-primary me-3"></i>
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
                
                ${data.exam_score ? `
                <div class="progress mt-2" style="height: 6px;">
                    <div class="progress-bar ${data.exam_score >= 60 ? 'bg-success' : 'bg-danger'}" 
                         role="progressbar" 
                         style="width: ${data.exam_score}%" 
                         aria-valuenow="${data.exam_score}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>
    `;
},

    buildCertificateButton() {
        const {userName, tabRole} = getAppState();
        return `
                <button 
                        type="button" 
                        class="btn btn-sm btn-primary rounded-3 px-3 show-modal-btn"
                        onclick="location.href='zhengshu.html?userName=${userName}&tabRole=${tabRole}'">
                  <i class="bi bi-file-text me-2"></i>查看证书
                </button>
              `;
    },
    buildProjectExperience(data) {
        const {userIntroData} = getAppState();

        // 如果状态是已通过，则不显示内容
        if (data.status === STATUS.APPROVED) {
            return ` `;
        }

        if (data.status === STATUS.PENDING) {
            return ` `;
        }

        return `
                  ${data.status === STATUS.REJECTED && data.reason ? `
                        <div class="card mt-2 p-2 bg-danger text-light rounded">
                          <p class="mb-0"><strong>不通过原因:</strong> ${data.reason}</p>
                        </div>
                      ` : ''}
              `;
    },

    buildTrainingContent(data) {

        if (data.status === STATUS.PENDING) {
            return ` `;
        }

        return `
                ${this.buildTrainingNotice()}
               <div class="btn-split-wrapper">
                        <button 
                        type="button" 
                        class="btn btn-sm btn-primary rounded-3 px-3 shadow-btn"
                        data-bs-toggle="modal" 
                        data-bs-target="#trainingCoursesModal">
                        <i class="bi bi-list-ul me-1"></i>查看课程明细
                    </button>
                </div>

    `;
    },

// 新增方法：填充模态框数据
    populateTrainingModal() {
        const {trainingCourses} = getAppState();
        const container = document.getElementById('coursesTableContainer');
        const loading = document.getElementById('loadingIndicator');
        const emptyState = document.getElementById('emptyState');
        const tbody = document.getElementById('coursesTableBody');
        const countElement = document.getElementById('coursesCount');

        // 显示加载状态
        loading.classList.remove('d-none');
        container.classList.add('d-none');
        emptyState.classList.add('d-none');

        // 模拟异步加载（实际使用时移除setTimeout）
        setTimeout(() => {
            loading.classList.add('d-none');

            if (!trainingCourses?.length) {
                emptyState.classList.remove('d-none');
                countElement.textContent = '0';
                return;
            }

            // 渲染表格
            tbody.innerHTML = trainingCourses.map((course, index) => `
        <tr>
          <td class="text-center fw-bold text-muted">${index + 1}</td>
          <td>
            <div class="d-flex align-items-center">
              <i class="bi bi-journal-text fs-5 text-primary me-3"></i>
              <div>
                <h6 class="mb-0">${course.name || '未命名课程'}</h6>
              </div>
            </div>
          </td>
          <td class="text-end">
            <div class="text-muted small">${course.completedAt || '无记录'}</div>
          </td>
        </tr>
      `).join('');

            // 更新计数
            countElement.textContent = trainingCourses.length;
            container.classList.remove('d-none');
        }, 800); // 模拟网络延迟
    },

    buildTrainingNotice() {
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
    },

    /**
     * 构建个人总结与自评内容
     * @param {Object} data 时间线项目数据
     * @returns {string} 生成的HTML内容
     */
    buildSelfEvaluationContent(data) {
        const {userIntroData, specialRole} = getAppState();
        const textXs = '0.8rem'; // 小号字体
        const textSm = '1rem'; // 稍大一点的字体

        // 已通过状态的显示
        if (data.status === STATUS.APPROVED ||
            (data.status === STATUS.COMPLETED && !specialRole)) {
            return `
            <button 
                        type="button" 
                        class="btn btn-sm btn-primary rounded-3 px-3 show-modal-btn"
                    data-modal-target="optionsModal"
                    style="font-size: 0.85rem">
                <i class="bi bi-info-circle me-2"></i>查看信息
            </button>
        `;
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
            <div class="list-group list-group-flush">
                ${userIntroData.map(item => `
                <div class="list-group-item border-0 px-0 py-1" style="font-size: ${textXs};">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="${this.getStatusColorClass(item.status)} fw-medium">
                            ${item.name || "未命名项目"}
                        </span>
                        <span class="badge ${this.getStatusStyles(item.status).badgeClass}" 
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
    },

    //构建认证总结内容
    buildLeanContent(data, canViewCert) {
        // 基础内容部分
        let content = ``;
        const specialRoleStatus = getAppState().specialRole;
        // 根据不同状态添加额外内容
        if (specialRoleStatus) {
            // 通过状态 - 特殊人
            content += ` `;
        } else if (data.status === STATUS.REJECTED) {
            // 未通过状态 - 显示原因
            content += `<div class="card mt-2 p-2  rounded">
                       <p class="mb-0"><strong>原因:</strong> ${data.certification_results || '无具体原因'}</p>
                    </div>`;
        } else if (data.status === STATUS.APPROVED) {
            // 通过状态 - 显示改善意见
            content += `<div class="card mt-2 p-2 rounded">
                       <p class="mb-0"><strong>改善意见:</strong> ${data.certification_results || '无改善意见'}</p>
                    </div>`;
        } else if (!canViewCert) {
            return `
                        <div class="d-flex justify-content-between align-items-center">
                            <p class="flex-grow-1 mb-0">${data.stage_description}</p>
                        </div>
                    `
        }

        // 证书按钮部分
        content += `<div class="mt-2">
                   ${canViewCert ? this.buildCertificateButton() : ''}
                </div>`;

        return content;
    },


    /**
     * 构建默认内容（用于非特殊阶段）
     * @param {Object} data 时间线项目数据
     * @param {Object} options 配置选项
     * @returns {string} 生成的HTML内容
     */
    buildDefaultContent(data, options) {
        const {badgeClass} = options;

        // 如果有开始时间且状态不是"已通过"，显示时间卡片
        const shouldShowTimeCard = data.start_time && data.status !== STATUS.APPROVED;
        const timeCard = shouldShowTimeCard ? `
        <div class="card mt-3 p-2 bg-primary text-light rounded">
            <p class="mb-1"><strong>报名时间:</strong>
                <span>${this.formatDate(data.start_time)}</span>
            </p>
            ${data.end_time ? `
                <p class="mb-1"><strong>审核时间:</strong>
                    <span>${this.formatDate(data.end_time)}</span>
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
};